import numpy as np
import pytest

from domain.preprocessing.pipeline import dominant_text_axis, remove_glare, rotate_quarter_turns

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
