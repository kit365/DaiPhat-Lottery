"""Locate ticket fields with a station's OCR template (legacy local path).

Admin draws template boxes on a sample photo that usually includes desk
background; the ``ticketFrame`` box marks the ticket on that photo and field
boxes whose centre lies outside it are ignored.

Regions are normalized 0..1 in one of two spaces:

* the sample photo itself (``frame_relative=False``), when the sample is
  registered onto the upload (see ``template_registration``);
* the upright ticket outline, when it is not: boxes are re-expressed
  relative to the paper edges found inside the frame (or to the frame when
  the sample photo is unavailable). Without a frame the sample photo is
  assumed to be a tight ticket crop.

Template regions are the source of truth: nothing here moves them based on
what OCR read.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from domain.ocr.base import OcrTextResult
from domain.scanning import paper_outline
from domain.scanning.paper_outline import Quad
from dto.request.scan_metadata import FieldLayoutMetadata, StationTemplateMetadata

TICKET_FRAME_FIELD = "ticketFrame"
# A frame smaller than this share of the sample photo is a mis-drag.
_MIN_FRAME_SIZE = 0.05
_FRAME_TOLERANCE = 0.005

# core-api template field names → ExtractedTicketFields attribute names.
_TEMPLATE_FIELD_ALIASES = {
    "price": "ticketType",
}

_SUPPORTED_FIELDS = frozenset(
    {"stationName", "numbers", "serialNumber", "drawDate", "ticketType", "batchCode"}
)

# A line belongs to a region when its centre falls inside the region grown
# by this fraction of the region size (OCR centres jitter around the box).
# Capped: a large box (lottery number) grown proportionally swallows the
# neighbouring draw-date / batch text.
_ASSIGN_MARGIN_RATIO = 0.10
_ASSIGN_MIN_MARGIN = 0.01
_ASSIGN_MAX_MARGIN = 0.03


@dataclass(frozen=True)
class TemplateRegion:
    field_name: str
    priority: int
    x: float
    y: float
    width: float
    height: float
    layout_id: int | None = None

    @property
    def center(self) -> tuple[float, float]:
        return self.x + self.width / 2.0, self.y + self.height / 2.0


def normalize_template_field(name: str | None) -> str | None:
    if not name:
        return None
    raw = name.strip()
    mapped = _TEMPLATE_FIELD_ALIASES.get(raw, raw)
    return mapped if mapped in _SUPPORTED_FIELDS else None


@dataclass(frozen=True)
class TemplateFrame:
    """Ticket outline on the template sample photo (normalized to the photo)."""

    x: float
    y: float
    width: float
    height: float

    def contains_center(self, x: float, y: float, w: float, h: float) -> bool:
        cx, cy = x + w / 2.0, y + h / 2.0
        return (
            self.x - _FRAME_TOLERANCE <= cx <= self.x + self.width + _FRAME_TOLERANCE
            and self.y - _FRAME_TOLERANCE <= cy <= self.y + self.height + _FRAME_TOLERANCE
        )

    def to_frame(self, x: float, y: float, w: float, h: float) -> tuple[float, float, float, float]:
        return (
            (x - self.x) / self.width,
            (y - self.y) / self.height,
            w / self.width,
            h / self.height,
        )


def template_frame(layouts: list[FieldLayoutMetadata]) -> TemplateFrame | None:
    """The template's ``ticketFrame`` box, if one was drawn and is usable."""
    for layout in layouts or []:
        if (layout.fieldName or "").strip() != TICKET_FRAME_FIELD:
            continue
        x0, y0 = max(0.0, float(layout.x)), max(0.0, float(layout.y))
        x1 = min(1.0, float(layout.x) + float(layout.width))
        y1 = min(1.0, float(layout.y) + float(layout.height))
        if x1 - x0 < _MIN_FRAME_SIZE or y1 - y0 < _MIN_FRAME_SIZE:
            return None
        return TemplateFrame(x=x0, y=y0, width=x1 - x0, height=y1 - y0)
    return None


def template_paper_quad(
    layouts: list[FieldLayoutMetadata], sample_image: np.ndarray | None
) -> Quad | None:
    """Paper edges inside the ticketFrame on the sample photo (normalized)."""
    frame = template_frame(layouts)
    if frame is None or sample_image is None or sample_image.size == 0:
        return None
    height, width = sample_image.shape[:2]
    x0, y0 = frame.x * width, frame.y * height
    x1, y1 = (frame.x + frame.width) * width, (frame.y + frame.height) * height
    snapped = paper_outline.refine_paper_quad(
        sample_image, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    )
    if snapped is None:
        return None
    return [(x / width, y / height) for x, y in snapped]


def regions_from_layouts(
    layouts: list[FieldLayoutMetadata],
    paper_quad: Quad | None = None,
    *,
    frame_relative: bool = True,
) -> list[TemplateRegion]:
    """Valid field boxes sorted by (field, priority). Lower priority first.

    With a ticket frame, boxes whose centre lies outside the frame are dropped.
    When ``frame_relative`` the rest are expressed relative to ``paper_quad``
    (the paper edges on the sample photo) when given, else relative to the
    frame; otherwise they stay in sample-photo coordinates.
    """
    frame = template_frame(layouts)
    regions: list[TemplateRegion] = []
    for layout in layouts or []:
        field_name = normalize_template_field(layout.fieldName)
        if field_name is None:
            continue
        x, y = float(layout.x), float(layout.y)
        w, h = float(layout.width), float(layout.height)
        if w <= 0 or h <= 0:
            continue
        if frame is not None:
            if not frame.contains_center(x, y, w, h):
                continue
            if frame_relative and paper_quad is not None:
                x, y, w, h = paper_outline.box_relative_to_quad(paper_quad, x, y, w, h)
            elif frame_relative:
                x, y, w, h = frame.to_frame(x, y, w, h)
        x0, y0 = max(0.0, x), max(0.0, y)
        x1, y1 = min(1.0, x + w), min(1.0, y + h)
        if x1 - x0 <= 0.005 or y1 - y0 <= 0.005:
            continue
        regions.append(
            TemplateRegion(
                field_name=field_name,
                priority=int(layout.priority or 1),
                x=x0,
                y=y0,
                width=x1 - x0,
                height=y1 - y0,
                layout_id=layout.id,
            )
        )
    regions.sort(key=lambda r: (r.field_name, r.priority, r.layout_id or 0))
    return regions


def group_by_field(regions: list[TemplateRegion]) -> dict[str, list[TemplateRegion]]:
    grouped: dict[str, list[TemplateRegion]] = {}
    for region in regions:
        grouped.setdefault(region.field_name, []).append(region)
    return grouped


def select_station_template(
    station_id: int | None,
    station_templates: list[StationTemplateMetadata],
) -> StationTemplateMetadata | None:
    if station_id is None:
        return None
    for template in station_templates or []:
        if template.stationId == station_id and template.fieldLayouts:
            return template
    return None


def _contains_with_margin(region: TemplateRegion, x: float, y: float) -> bool:
    mx = min(max(region.width * _ASSIGN_MARGIN_RATIO, _ASSIGN_MIN_MARGIN), _ASSIGN_MAX_MARGIN)
    my = min(max(region.height * _ASSIGN_MARGIN_RATIO, _ASSIGN_MIN_MARGIN), _ASSIGN_MAX_MARGIN)
    return (
        region.x - mx <= x <= region.x + region.width + mx
        and region.y - my <= y <= region.y + region.height + my
    )


def lines_by_region(
    located: list[tuple[OcrTextResult, float, float]],
    regions: list[TemplateRegion],
) -> dict[TemplateRegion, list[OcrTextResult]]:
    """Whole-ticket OCR lines whose centre (in region space) falls in each region.

    ``located`` pairs each line with its centre in the regions' space. A line
    may belong to several regions: templates mark the same printed text for
    more than one field (e.g. ``A 424944`` as both serial and number).
    Raw text is kept untouched.
    """
    grouped: dict[TemplateRegion, list[OcrTextResult]] = {}
    for line, x, y in located or []:
        for region in regions or []:
            if _contains_with_margin(region, x, y):
                grouped.setdefault(region, []).append(line)
    return grouped


def region_to_pixels(
    region: TemplateRegion, width: int, height: int
) -> tuple[int, int, int, int] | None:
    x = int(round(region.x * width))
    y = int(round(region.y * height))
    w = int(round(region.width * width))
    h = int(round(region.height * height))
    x = min(max(x, 0), max(width - 1, 0))
    y = min(max(y, 0), max(height - 1, 0))
    w = min(w, width - x)
    h = min(h, height - y)
    if w < 4 or h < 4:
        return None
    return x, y, w, h
