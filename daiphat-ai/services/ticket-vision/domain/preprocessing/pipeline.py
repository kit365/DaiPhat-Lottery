import base64
import io

import cv2
import numpy as np
from PIL import Image, ImageOps

from domain.detection.base import DetectedRegion


class ImageTooLargeError(ValueError):
    """Raised when the uploaded file exceeds TICKET_VISION_MAX_FILE_SIZE_MB."""


class InvalidImageError(ValueError):
    """Raised when the uploaded bytes can't be decoded as an image."""


def guard_file_size(image_bytes: bytes, max_size_mb: int) -> None:
    max_bytes = max_size_mb * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise ImageTooLargeError(
            f"Ảnh vượt quá kích thước cho phép ({max_size_mb}MB)."
        )


def decode_image(image_bytes: bytes) -> np.ndarray:
    """Decode upload bytes to BGR, applying EXIF orientation like browsers do.

    ``cv2.imdecode`` ignores EXIF orientation while browsers rotate for display.
    Without this step, OCR bboxes are computed in the unrotated pixel grid and
    appear shifted/rotated relative to the Admin overlay on the same file.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as pil_image:
            oriented = ImageOps.exif_transpose(pil_image)
            if oriented is None:
                oriented = pil_image
            rgb = oriented.convert("RGB")
            array = np.asarray(rgb)
            return cv2.cvtColor(array, cv2.COLOR_RGB2BGR)
    except Exception:
        # Fall back for exotic codecs Pillow rejects but OpenCV can read.
        buffer = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
        if image is None:
            raise InvalidImageError("Không thể đọc file ảnh. Vui lòng thử lại.") from None
        return image


def resize_if_needed(image: np.ndarray, max_dimension: int) -> np.ndarray:
    """Downscale the source photo so neither side exceeds max_dimension.

    Mobile is expected to already resize to <=1920px before upload (doc
    section 6), but the service re-checks defensively. All detection/OCR
    downstream runs in *this* resized coordinate space, and bbox/corners
    returned to the client are relative to it too -- the mobile app should
    render overlays against the same (resized) image it uploaded, not the
    original camera capture.
    """
    height, width = image.shape[:2]
    longest_side = max(height, width)
    if longest_side <= max_dimension:
        return image

    scale = max_dimension / float(longest_side)
    new_size = (int(width * scale), int(height * scale))
    return cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)


def trim_uniform_borders(image: np.ndarray, *, max_trim_ratio: float = 0.12) -> np.ndarray:
    """Crop near-uniform margins (letterbox / table edges) before vision encode.

    Conservative by design: only removes obvious empty borders and keeps a
    generous pad so ticket text near edges is never clipped. No-op when trim
    would remove too much of the frame.
    """
    if image is None or image.size == 0:
        return image
    height, width = image.shape[:2]
    if height < 40 or width < 40:
        return image

    gray = to_grayscale(image)
    # Downsample for speed on large frames.
    probe_scale = min(1.0, 640.0 / float(max(height, width)))
    probe = (
        gray
        if probe_scale >= 0.999
        else cv2.resize(
            gray,
            (max(1, int(width * probe_scale)), max(1, int(height * probe_scale))),
            interpolation=cv2.INTER_AREA,
        )
    )
    # Content = not near-white and not near-black.
    content = ((probe > 28) & (probe < 245)).astype(np.uint8) * 255
    coords = cv2.findNonZero(content)
    if coords is None:
        return image

    x, y, w, h = cv2.boundingRect(coords)
    # Map probe box back to full resolution.
    inv = 1.0 / probe_scale
    x1 = max(0, int(x * inv))
    y1 = max(0, int(y * inv))
    x2 = min(width, int((x + w) * inv))
    y2 = min(height, int((y + h) * inv))
    # Generous pad — prefer keeping a bit of background over clipping text.
    pad = int(round(min(width, height) * 0.03))
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(width, x2 + pad)
    y2 = min(height, y2 + pad)
    crop_w = max(1, x2 - x1)
    crop_h = max(1, y2 - y1)
    area_ratio = (crop_w * crop_h) / float(width * height)
    if area_ratio > 0.98 or area_ratio < (1.0 - max_trim_ratio):
        return image
    return image[y1:y2, x1:x2]


def expand_bbox(
    x: int,
    y: int,
    w: int,
    h: int,
    image_width: int,
    image_height: int,
    *,
    pad_ratio: float = 0.04,
) -> tuple[int, int, int, int]:
    """Expand a ticket/field box outward so edge text is not clipped."""
    pad = int(round(min(image_width, image_height) * max(0.0, pad_ratio)))
    pad = max(pad, 8)
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(image_width, x + w + pad)
    y2 = min(image_height, y + h + pad)
    return x1, y1, max(1, x2 - x1), max(1, y2 - y1)


def encode_to_jpeg_bytes(image: np.ndarray, quality: int = 94) -> bytes:
    ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        raise InvalidImageError("Không thể mã hóa ảnh vé đã xử lý.")
    return buffer.tobytes()


def encode_to_jpeg_bytes_bounded(
    image: np.ndarray,
    *,
    max_bytes: int = 3_000_000,
    quality_start: int = 94,
    quality_floor: int = 85,
    max_dimension: int = 2400,
    allow_geometry_shrink: bool = True,
) -> bytes:
    """JPEG-encode for vision LLMs with a soft size budget.

    Readability first: keep resolution and a high JPEG quality floor. Only
    when absolutely necessary do we lower quality slightly, then gently
    downscale. Set allow_geometry_shrink=False when bbox coords must stay
    tied to ``image``.
    """
    working = image
    if max(working.shape[:2]) > max_dimension:
        working = resize_if_needed(working, max_dimension)

    quality = quality_start
    encoded = encode_to_jpeg_bytes(working, quality)
    while len(encoded) > max_bytes and quality > quality_floor:
        quality = max(quality_floor, quality - 3)
        encoded = encode_to_jpeg_bytes(working, quality)

    if not allow_geometry_shrink:
        return encoded

    # Still too big: shrink geometry very gently and re-encode.
    shrink_steps = 0
    while len(encoded) > max_bytes and shrink_steps < 3:
        shrink_steps += 1
        height, width = working.shape[:2]
        working = cv2.resize(
            working,
            (max(1, int(width * 0.95)), max(1, int(height * 0.95))),
            interpolation=cv2.INTER_AREA,
        )
        encoded = encode_to_jpeg_bytes(working, quality)
    return encoded


def encode_to_base64_jpeg(image: np.ndarray, quality: int = 98) -> str:
    return base64.b64encode(encode_to_jpeg_bytes(image, quality)).decode("ascii")


def encode_to_base64_png(image: np.ndarray) -> str:
    """Lossless preview encode — preferred for Admin review sharpness."""
    ok, buffer = cv2.imencode(".png", image)
    if not ok:
        raise InvalidImageError("Không thể mã hóa ảnh vé đã xử lý.")
    return base64.b64encode(buffer.tobytes()).decode("ascii")


def perspective_warp(image: np.ndarray, corners: list[tuple[int, int]]) -> np.ndarray:
    """Rectify a (possibly skewed) ticket quad into a straight-on crop."""
    (top_left, top_right, bottom_right, bottom_left) = [np.array(p, dtype="float32") for p in corners]

    width_top = np.linalg.norm(top_right - top_left)
    width_bottom = np.linalg.norm(bottom_right - bottom_left)
    height_left = np.linalg.norm(bottom_left - top_left)
    height_right = np.linalg.norm(bottom_right - top_right)

    out_width = max(int(width_top), int(width_bottom), 1)
    out_height = max(int(height_left), int(height_right), 1)

    src = np.array([top_left, top_right, bottom_right, bottom_left], dtype="float32")
    dst = np.array(
        [[0, 0], [out_width - 1, 0], [out_width - 1, out_height - 1], [0, out_height - 1]],
        dtype="float32",
    )

    matrix = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(image, matrix, (out_width, out_height))


MIN_OCR_CROP_DIMENSION = 300


def upscale_if_too_small(image: np.ndarray, min_dimension: int = MIN_OCR_CROP_DIMENSION) -> np.ndarray:
    """Upscale a warped ticket crop whose shorter side is below min_dimension.

    EasyOCR's (and PaddleOCR's) text detector reliably under-detects or
    returns zero boxes on small crops -- a ticket photographed far away, or
    a detection region tighter than the full ticket, can otherwise starve
    OCR down to empty results even though the text is legible once scaled
    up. Uses INTER_CUBIC (vs. resize_if_needed's INTER_AREA) since this is
    an upscale, not a downscale.
    """
    height, width = image.shape[:2]
    shortest_side = min(height, width)
    if shortest_side <= 0 or shortest_side >= min_dimension:
        return image

    scale = min_dimension / float(shortest_side)
    new_size = (int(round(width * scale)), int(round(height * scale)))
    return cv2.resize(image, new_size, interpolation=cv2.INTER_CUBIC)


def rotate_quarter_turns(image: np.ndarray, quarter_turns: int) -> np.ndarray:
    """Rotate clockwise by quarter_turns * 90 degrees (mod 4)."""
    quarter_turns %= 4
    if quarter_turns == 0:
        return image
    rotate_code = {
        1: cv2.ROTATE_90_CLOCKWISE,
        2: cv2.ROTATE_180,
        3: cv2.ROTATE_90_COUNTERCLOCKWISE,
    }[quarter_turns]
    return cv2.rotate(image, rotate_code)


def dominant_text_axis(image: np.ndarray) -> int:
    """Cheap geometric guess at whether printed text in this image already
    runs horizontally (0) or the image needs a 90-degree turn to make it so
    (1) -- e.g. a ticket photographed in portrait/sideways orientation.

    Uses the dominant direction of straight edges (Hough line segments):
    dense printed text produces many short near-axis-aligned strokes, and
    whichever axis carries more total line length wins. Can NOT distinguish
    upright from upside-down (a 180-degree rotation looks identical to this
    heuristic) -- that ambiguity is resolved separately with an OCR
    confidence probe, since only the OCR engine actually knows which way is
    "up" for the printed content (see TicketScanService._correct_orientation).
    """
    gray = to_grayscale(image)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=60, minLineLength=25, maxLineGap=5)
    if lines is None:
        return 0

    horizontal_length = 0.0
    vertical_length = 0.0
    # OpenCV 4.x returns (N, 1, 4); 5.x dropped the middle axis and returns
    # (N, 4). Reshape rather than index a fixed rank so this reads the same
    # segments under either -- requirements.txt pins <5, but a transitive
    # dependency (ultralytics) has pulled 5.x in before.
    for x1, y1, x2, y2 in np.asarray(lines).reshape(-1, 4):
        length = float(np.hypot(x2 - x1, y2 - y1))
        angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
        angle = min(angle, 180 - angle)  # fold into 0..90
        if angle <= 20:
            horizontal_length += length
        elif angle >= 70:
            vertical_length += length

    return 1 if vertical_length > horizontal_length * 1.3 else 0


# Specular highlight (glare) detection thresholds, in HSV. A reflection off
# the ticket's glossy surface under overhead lighting reads as a patch that
# is both very bright (high V) and nearly colorless (low S) -- unlike
# genuinely bright print (a yellow/white ticket background, gold foil),
# which stays either saturated/colored or covers a large uniform area
# rather than a tight blown-out blob.
_GLARE_VALUE_THRESHOLD = 235
_GLARE_SATURATION_THRESHOLD = 40
_GLARE_DILATE_KERNEL = np.ones((5, 5), np.uint8)
# Safety cap: if "glare" would cover more than this fraction of the image,
# it's more likely a legitimately bright/white ticket background than an
# actual reflection -- skip inpainting rather than risk hallucinating
# texture over real (if pale) print.
_MAX_GLARE_COVERAGE_RATIO = 0.25


def remove_glare(image: np.ndarray) -> np.ndarray:
    """Detect and inpaint specular highlights from a glossy ticket surface.

    A flat, blown-out reflection gives OCR nothing to read (as opposed to
    faded or noisy text, which at least has some signal) -- inpainting fills
    the highlight with plausible surrounding texture/color instead, which is
    strictly more useful to the text detector than solid white. No-op when
    no glare-shaped region is found (the common case for a well-lit photo).
    """
    if len(image.shape) != 3:
        return image  # already grayscale -- nothing to key color/glare off of

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    _, saturation, value = cv2.split(hsv)

    glare_mask = ((value >= _GLARE_VALUE_THRESHOLD) & (saturation <= _GLARE_SATURATION_THRESHOLD)).astype(np.uint8) * 255
    coverage = np.count_nonzero(glare_mask) / glare_mask.size
    if coverage <= 0 or coverage > _MAX_GLARE_COVERAGE_RATIO:
        return image

    glare_mask = cv2.dilate(glare_mask, _GLARE_DILATE_KERNEL, iterations=1)
    return cv2.inpaint(image, glare_mask, inpaintRadius=5, flags=cv2.INPAINT_TELEA)


def denoise(image: np.ndarray, *, strength: float = 5.0) -> np.ndarray:
    """Light denoise — strong NLMeans softens printed digits and hurts OCR."""
    h = float(max(0.0, strength))
    if h <= 0.01:
        return image
    if len(image.shape) == 3:
        return cv2.fastNlMeansDenoisingColored(image, None, h, h, 7, 21)
    return cv2.fastNlMeansDenoising(image, None, h, 7, 21)


def to_grayscale(image: np.ndarray) -> np.ndarray:
    if len(image.shape) == 2:
        return image
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def enhance_contrast(gray_image: np.ndarray) -> np.ndarray:
    """CLAHE contrast enhancement -- helps OCR on shadowed/uneven lighting."""
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray_image)


def normalize_lighting(image: np.ndarray) -> np.ndarray:
    """Balance brightness/contrast on the L channel without crushing color."""
    if len(image.shape) != 3:
        return enhance_contrast(image)

    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    lightness, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    lightness = clahe.apply(lightness)
    # Gentle midtone lift for dull phone photos.
    lightness = cv2.convertScaleAbs(lightness, alpha=1.05, beta=6)
    merged = cv2.merge((lightness, a_channel, b_channel))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def sharpen_unsharp_mask(
    image: np.ndarray,
    *,
    amount: float = 0.55,
    radius: float = 1.2,
) -> np.ndarray:
    """Unsharp-mask sharpening to recover edge clarity after resize/JPEG."""
    if amount <= 0:
        return image
    sigma = max(0.5, float(radius))
    blurred = cv2.GaussianBlur(image, (0, 0), sigmaX=sigma, sigmaY=sigma)
    return cv2.addWeighted(image, 1.0 + amount, blurred, -amount, 0)


def enhance_for_ocr(image: np.ndarray) -> np.ndarray:
    """Mild OCR prep: lighting normalize only — no denoise / heavy sharpen stack.

    Aggressive filters previously stacked with JPEG and blurred ticket previews.
    """
    if image is None or image.size == 0:
        return image
    return normalize_lighting(image)


class ProcessedTicketCrop:
    """The two derivatives every detected ticket needs downstream.

    preview: color, perspective-warped -- for Admin overlay / Cloudinary.
    ocr_ready: grayscale + contrast-enhanced for classic OCR engines.
    """

    def __init__(self, preview: np.ndarray, ocr_ready: np.ndarray) -> None:
        self.preview = preview
        self.ocr_ready = ocr_ready


def rotate_crop(crop: ProcessedTicketCrop, quarter_turns: int) -> ProcessedTicketCrop:
    """Rotate both derivatives of a crop together, keeping them in sync."""
    if quarter_turns % 4 == 0:
        return crop
    return ProcessedTicketCrop(
        preview=rotate_quarter_turns(crop.preview, quarter_turns),
        ocr_ready=rotate_quarter_turns(crop.ocr_ready, quarter_turns),
    )


def process_ticket_crop(source_image: np.ndarray, region: DetectedRegion) -> ProcessedTicketCrop:
    if len(region.corners) == 4:
        warped = perspective_warp(source_image, region.corners)
    else:
        # Fallback: no usable quad (e.g. a hand-supplied bbox) -- crop the
        # axis-aligned box instead of failing the whole scan.
        x, y, w, h = region.bbox
        warped = source_image[y : y + h, x : x + w]

    # Admin review / durable crop: geometry only — no glare/OCR filters.
    preview = warped
    # OCR path may upscale tiny crops and normalize lighting separately.
    ocr_source = upscale_if_too_small(warped)
    ocr_source = remove_glare(ocr_source)
    gray = to_grayscale(ocr_source)
    ocr_ready = enhance_contrast(gray)

    return ProcessedTicketCrop(preview=preview, ocr_ready=ocr_ready)
