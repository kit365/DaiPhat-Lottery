import cv2
import numpy as np
import pytest

from domain.detection.contour_detector import ContourTicketDetector

# Requires opencv-python-headless + numpy to be installed -- see README.md
# "Local setup" for why they aren't available in every environment.
cv2_numpy = pytest.importorskip("cv2")


def _detector(max_tickets: int = 15) -> ContourTicketDetector:
    return ContourTicketDetector(
        min_aspect_ratio=0.28,
        max_aspect_ratio=0.62,
        min_area_ratio=0.01,
        max_tickets=max_tickets,
    )


def _canvas(width: int = 1200, height: int = 900) -> np.ndarray:
    return np.zeros((height, width, 3), dtype=np.uint8)


def _draw_ticket(canvas: np.ndarray, x: int, y: int, w: int, h: int) -> None:
    cv2.rectangle(canvas, (x, y), (x + w, y + h), (255, 255, 255), thickness=-1)


def test_detects_a_single_ticket_shaped_rectangle():
    canvas = _canvas()
    _draw_ticket(canvas, x=100, y=80, w=300, h=600)  # aspect ratio 0.5, in-band

    result = _detector().detect(canvas)

    assert len(result.regions) == 1
    x, y, w, h = result.regions[0].bbox
    assert abs(x - 100) <= 15
    assert abs(y - 80) <= 15
    assert abs(w - 300) <= 20
    assert abs(h - 600) <= 20
    assert len(result.regions[0].corners) == 4


def test_ignores_shapes_outside_the_aspect_ratio_band():
    canvas = _canvas()
    _draw_ticket(canvas, x=100, y=80, w=600, h=620)  # aspect ratio ~0.97, square-ish, not a ticket

    result = _detector().detect(canvas)

    assert result.regions == []


def test_detects_multiple_tickets_in_reading_order():
    canvas = _canvas(width=1600, height=900)
    _draw_ticket(canvas, x=900, y=100, w=250, h=500)  # right ticket, drawn first
    _draw_ticket(canvas, x=100, y=100, w=250, h=500)  # left ticket, same row

    result = _detector().detect(canvas)

    assert len(result.regions) == 2
    # same row -> left-to-right reading order regardless of draw/contour order
    assert result.regions[0].bbox[0] < result.regions[1].bbox[0]


def test_caps_detections_at_max_tickets_and_warns():
    canvas = _canvas(width=2400, height=1600)
    for i in range(20):
        row, col = divmod(i, 5)
        _draw_ticket(canvas, x=50 + col * 460, y=50 + row * 400, w=250, h=350)

    result = _detector(max_tickets=15).detect(canvas)

    assert len(result.regions) == 15
    assert any("15" in warning for warning in result.warnings)
