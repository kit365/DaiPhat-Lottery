"""Unit tests for LLM bbox coercion / YOLO preference."""

from dto.response.scan_response import BoundingBox
from infra.vision_extraction import TicketBBox
from domain.scanning.llm_ticket_scan_service import (
    _clamp_bbox,
    _resolve_bbox,
    _should_prefer_yolo_ticket,
)


def test_clamp_bbox_converts_normalized_unit_square():
    box = _clamp_bbox(TicketBBox(x=0.1, y=0.2, width=0.5, height=0.4), 1000, 800)
    assert box == BoundingBox(
        x=100,
        y=160,
        width=500,
        height=320,
        corners=[[100, 160], [600, 160], [600, 480], [100, 480]],
    )


def test_clamp_bbox_keeps_absolute_pixels():
    box = _clamp_bbox(TicketBBox(x=40, y=50, width=200, height=300), 1000, 800)
    assert box is not None
    assert (box.x, box.y, box.width, box.height) == (40, 50, 200, 300)


def test_resolve_bbox_prefers_larger_yolo_when_llm_undersized():
    llm = TicketBBox(x=20, y=20, width=300, height=400)
    yolo = [(10, 10, 900, 1200)]
    final, source = _resolve_bbox(llm, 1000, 1400, 0, 1, yolo)
    assert (final.x, final.y, final.width, final.height) == (10, 10, 900, 1200)
    assert source is not None
    assert (source.width, source.height) == (300, 400)


def test_should_prefer_yolo_when_llm_area_much_smaller():
    llm = BoundingBox(x=0, y=0, width=300, height=400, corners=[])
    yolo = BoundingBox(x=0, y=0, width=900, height=1200, corners=[])
    assert _should_prefer_yolo_ticket(llm, yolo) is True
