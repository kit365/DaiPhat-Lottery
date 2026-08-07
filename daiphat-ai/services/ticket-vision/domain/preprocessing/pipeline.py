import base64

import cv2
import numpy as np

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
    buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise InvalidImageError("Không thể đọc file ảnh. Vui lòng thử lại.")
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


def denoise(image: np.ndarray) -> np.ndarray:
    if len(image.shape) == 3:
        return cv2.fastNlMeansDenoisingColored(image, None, 7, 7, 7, 21)
    return cv2.fastNlMeansDenoising(image, None, 7, 7, 21)


def to_grayscale(image: np.ndarray) -> np.ndarray:
    if len(image.shape) == 2:
        return image
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def enhance_contrast(gray_image: np.ndarray) -> np.ndarray:
    """CLAHE contrast enhancement -- helps OCR on shadowed/uneven lighting."""
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray_image)


def encode_to_base64_jpeg(image: np.ndarray, quality: int = 85) -> str:
    ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        raise InvalidImageError("Không thể mã hóa ảnh vé đã xử lý.")
    return base64.b64encode(buffer.tobytes()).decode("ascii")


class ProcessedTicketCrop:
    """The two derivatives every detected ticket needs downstream.

    preview: color, denoised, perspective-warped -- for the mobile overlay
      preview and (once confirmed) the image uploaded to Cloudinary by Java.
    ocr_ready: grayscale + denoised + contrast-enhanced on top of preview --
      what actually gets fed to the OCR engines. Kept as a separate object
      because storage/preview quality and OCR-friendliness are different
      goals (doc section 4, Flow 2: "grayscale, denoise, perspective warp,
      contrast enhancement").
    """

    def __init__(self, preview: np.ndarray, ocr_ready: np.ndarray) -> None:
        self.preview = preview
        self.ocr_ready = ocr_ready


def process_ticket_crop(source_image: np.ndarray, region: DetectedRegion) -> ProcessedTicketCrop:
    if len(region.corners) == 4:
        warped = perspective_warp(source_image, region.corners)
    else:
        # Fallback: no usable quad (e.g. a hand-supplied bbox) -- crop the
        # axis-aligned box instead of failing the whole scan.
        x, y, w, h = region.bbox
        warped = source_image[y : y + h, x : x + w]

    preview = denoise(warped)
    gray = to_grayscale(preview)
    ocr_ready = enhance_contrast(denoise(gray))

    return ProcessedTicketCrop(preview=preview, ocr_ready=ocr_ready)
