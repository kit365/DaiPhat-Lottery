import numpy as np
import pytest

from domain.preprocessing.pipeline import (
    dominant_text_axis,
    encode_to_jpeg_bytes_bounded,
    enhance_for_ocr,
    remove_glare,
    resize_if_needed,
    rotate_quarter_turns,
    sharpen_unsharp_mask,
    trim_uniform_borders,
)

# Requires opencv-python-headless + numpy to be installed -- see README.md
# "Local setup" for why they aren't available in every environment.
cv2_numpy = pytest.importorskip("cv2")

import cv2  # noqa: E402 -- must follow the importorskip guard above


def test_rotate_quarter_turns_moves_corners_as_expected():
    # Non-square so an accidental height/width swap bug would be caught.
    image = np.zeros((10, 20, 3), dtype=np.uint8)
    image[0, 0] = (255, 255, 255)  # mark the original top-left corner

    clockwise = rotate_quarter_turns(image, 1)
    assert clockwise.shape[:2] == (20, 10)
    assert tuple(clockwise[0, -1]) == (255, 255, 255)  # top-left -> top-right

    upside_down = rotate_quarter_turns(image, 2)
    assert upside_down.shape[:2] == (10, 20)
    assert tuple(upside_down[-1, -1]) == (255, 255, 255)  # top-left -> bottom-right

    counter_clockwise = rotate_quarter_turns(image, 3)
    assert counter_clockwise.shape[:2] == (20, 10)
    assert tuple(counter_clockwise[-1, 0]) == (255, 255, 255)  # top-left -> bottom-left

    full_turn = rotate_quarter_turns(image, 4)
    assert (full_turn == image).all()


def test_dominant_text_axis_detects_horizontal_text_lines():
    canvas = np.zeros((200, 200), dtype=np.uint8)
    for y in range(20, 180, 20):
        cv2.line(canvas, (10, y), (190, y), 255, thickness=2)

    assert dominant_text_axis(canvas) == 0


def test_dominant_text_axis_detects_vertical_text_lines():
    canvas = np.zeros((200, 200), dtype=np.uint8)
    for x in range(20, 180, 20):
        cv2.line(canvas, (x, 10), (x, 190), 255, thickness=2)

    assert dominant_text_axis(canvas) == 1


def test_dominant_text_axis_defaults_to_zero_on_a_blank_image():
    canvas = np.zeros((200, 200), dtype=np.uint8)

    assert dominant_text_axis(canvas) == 0


def test_remove_glare_inpaints_a_small_bright_low_saturation_patch():
    canvas = np.full((100, 100, 3), (40, 80, 120), dtype=np.uint8)  # a colored (non-white) background
    cv2.circle(canvas, (50, 50), 10, (255, 255, 255), thickness=-1)  # bright, colorless glare spot

    result = remove_glare(canvas)

    # The inpainted center should no longer be flat white -- it should have
    # been filled in from the surrounding colored background instead.
    assert tuple(int(c) for c in result[50, 50]) != (255, 255, 255)


def test_remove_glare_is_a_no_op_on_a_clean_photo():
    canvas = np.full((100, 100, 3), (40, 80, 120), dtype=np.uint8)

    result = remove_glare(canvas)

    assert (result == canvas).all()


def test_remove_glare_skips_a_mostly_bright_white_ticket_background():
    # A legitimately pale/white ticket background shouldn't be treated as
    # glare and inpainted over -- only a small localized highlight should be.
    canvas = np.full((100, 100, 3), (250, 250, 250), dtype=np.uint8)

    result = remove_glare(canvas)

    assert (result == canvas).all()


def test_trim_uniform_borders_crops_letterbox_margins():
    canvas = np.full((400, 600, 3), 255, dtype=np.uint8)
    # Content must stay above (1 - max_trim_ratio≈0.12) so the helper actually crops.
    canvas[16:384, 20:580] = (30, 90, 180)

    trimmed = trim_uniform_borders(canvas)
    assert trimmed.shape[0] < canvas.shape[0]
    assert trimmed.shape[1] < canvas.shape[1]
    assert trimmed.shape[0] >= 330
    assert trimmed.shape[1] >= 520


def test_encode_to_jpeg_bytes_bounded_respects_size_budget():
    # Noisy content compresses poorly — forces quality + optional shrink path.
    rng = np.random.default_rng(42)
    canvas = rng.integers(0, 255, size=(1600, 1600, 3), dtype=np.uint8)
    encoded = encode_to_jpeg_bytes_bounded(
        canvas,
        max_bytes=400_000,
        quality_start=90,
        quality_floor=40,
        allow_geometry_shrink=True,
    )
    assert len(encoded) <= 400_000
    assert encoded[:2] == b"\xff\xd8"


def test_encode_to_jpeg_bytes_bounded_keeps_high_quality_floor_by_default():
    """Default floor must stay OCR-friendly (no crash down to low JPEG)."""
    canvas = np.full((800, 1200, 3), (210, 200, 180), dtype=np.uint8)
    cv2.putText(canvas, "424944", (80, 420), cv2.FONT_HERSHEY_SIMPLEX, 3.0, (20, 20, 20), 6)
    encoded = encode_to_jpeg_bytes_bounded(canvas, allow_geometry_shrink=False)
    assert encoded[:2] == b"\xff\xd8"
    assert len(encoded) > 20_000


def test_enhance_for_ocr_preserves_shape_and_is_mild():
    canvas = np.full((120, 180, 3), (90, 100, 110), dtype=np.uint8)
    cv2.rectangle(canvas, (20, 30), (160, 90), (40, 40, 40), thickness=-1)
    result = enhance_for_ocr(canvas)
    assert result.shape == canvas.shape
    # Lighting normalize should stay close to the source mean.
    assert abs(float(result.mean()) - float(canvas.mean())) < 40.0


def test_encode_to_base64_png_is_lossless():
    from domain.preprocessing.pipeline import encode_to_base64_png, decode_image
    import base64

    canvas = np.full((40, 60, 3), (30, 90, 180), dtype=np.uint8)
    canvas[10, 20] = (1, 2, 3)
    encoded = encode_to_base64_png(canvas)
    assert encoded
    raw = base64.b64decode(encoded)
    assert raw[:8] == b"\x89PNG\r\n\x1a\n"
    decoded = decode_image(raw)
    assert decoded.shape == canvas.shape
    assert (decoded == canvas).all()


def test_sharpen_unsharp_mask_increases_local_contrast_on_edges():
    canvas = np.zeros((64, 64), dtype=np.uint8)
    canvas[:, 32:] = 200
    sharpened = sharpen_unsharp_mask(canvas, amount=0.8, radius=1.0)
    # Edge neighborhood should diverge from the flat step after sharpening.
    assert abs(int(sharpened[32, 30]) - int(sharpened[32, 34])) >= abs(
        int(canvas[32, 30]) - int(canvas[32, 34])
    )


def test_expand_bbox_pads_outward_without_leaving_image():
    from domain.preprocessing.pipeline import expand_bbox

    x, y, w, h = expand_bbox(10, 20, 100, 80, 200, 200, pad_ratio=0.05)
    assert x <= 10 and y <= 20
    assert x + w >= 110 and y + h >= 100
    assert x >= 0 and y >= 0 and x + w <= 200 and y + h <= 200


def test_resize_if_needed_caps_longest_side():
    canvas = np.zeros((2400, 1800, 3), dtype=np.uint8)
    resized = resize_if_needed(canvas, 1600)
    assert max(resized.shape[:2]) == 1600
