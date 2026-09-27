"""Complete-ticket crop: detector boxes grown/shrunk to the whole paper sheet,
split detections merged, and template regions mapped onto the processed crop."""

from __future__ import annotations

from types import SimpleNamespace

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from domain.detection.base import DetectedRegion  # noqa: E402
from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult  # noqa: E402
from domain.parsing.ticket_parser import TicketParser  # noqa: E402
from domain.preprocessing.pipeline import ProcessedTicketCrop, rotate_crop  # noqa: E402
from domain.scanning import paper_outline  # noqa: E402
from domain.scanning import template_field_locator as locator  # noqa: E402
from domain.scanning.ticket_scan_service import (  # noqa: E402
    _COMPLETE_TICKET_CROP_MARGIN,
    TicketScanService,
    _TemplateContext,
    _TemplatePlacement,
    _relocate_crop_lines,
    _unit_square_to,
)
from domain.stations.matcher import StationMatcher  # noqa: E402
from domain.validation.format_validator import FormatValidator  # noqa: E402
from dto.request.scan_metadata import FieldLayoutMetadata, StationTemplateMetadata  # noqa: E402

_PAPER = [(300, 300), (900, 300), (900, 620), (300, 620)]


def _desk(size=(900, 1200), seed=3):
    rng = np.random.default_rng(seed)
    h, w = size
    return rng.integers(60, 100, size=(h, w, 3), dtype=np.uint8)


def _two_tone_ticket(image, quad, split=0.6):
    """Ticket whose lower band is printed unlike the upper part (like the
    number strip of a real ticket), so a detector may frame only one part."""
    x0, y0 = np.int32(quad).min(axis=0)
    x1, y1 = np.int32(quad).max(axis=0)
    cut = int(y0 + (y1 - y0) * split)
    cv2.rectangle(image, (int(x0), int(y0)), (int(x1), cut), (230, 200, 120), -1)
    cv2.rectangle(image, (int(x0), cut), (int(x1), int(y1)), (190, 230, 245), -1)
    for i in range(6):
        cv2.putText(image, f"{i}{i}{i}", (int(x0) + 30 + 90 * i, cut - 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (40, 40, 200), 2)
    return image


def _close(quad, expected, tol):
    return all(abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol for a, b in zip(quad, expected))


# --- geometry ---------------------------------------------------------------------


def test_expand_quad_adds_a_uniform_border_in_the_quads_own_frame():
    grown = paper_outline.expand_quad([(100, 100), (300, 100), (300, 200), (100, 200)], 0.1)
    assert grown == pytest.approx([(80, 90), (320, 90), (320, 210), (80, 210)])


def test_quad_iou():
    a = [(0, 0), (10, 0), (10, 10), (0, 10)]
    assert paper_outline.quad_iou(a, a) == pytest.approx(1.0)
    assert paper_outline.quad_iou(a, [(20, 0), (30, 0), (30, 10), (20, 10)]) == 0.0
    assert paper_outline.quad_iou(a, [(5, 0), (15, 0), (15, 10), (5, 10)]) == pytest.approx(1 / 3)


def test_rotate_crop_keeps_paper_and_crop_corners_in_step():
    crop = ProcessedTicketCrop(
        preview=np.zeros((10, 20, 3), np.uint8),
        ocr_ready=np.zeros((10, 20, 3), np.uint8),
        source_quad=[(0, 0), (1, 0), (1, 1), (0, 1)],
        paper_quad=[(10, 10), (11, 10), (11, 11), (10, 11)],
    )
    turned = rotate_crop(crop, 1)
    assert turned.source_quad == [(0, 1), (0, 0), (1, 0), (1, 1)]
    assert turned.paper_quad == [(10, 11), (10, 10), (11, 10), (11, 11)]


# --- completion -------------------------------------------------------------------


def test_complete_ticket_quad_recovers_an_edge_the_detector_cut_off():
    image = _two_tone_ticket(_desk(), _PAPER)
    rough = [(300, 300), (720, 300), (720, 620), (300, 620)]  # right 30% missing
    completed = paper_outline.complete_ticket_quad(image, rough)
    assert completed is not None
    assert _close(completed, _PAPER, 12)


def test_complete_ticket_quad_drops_desk_the_detector_took_in():
    image = _two_tone_ticket(_desk(), _PAPER)
    loose = [(240, 250), (960, 250), (960, 680), (240, 680)]
    completed = paper_outline.complete_ticket_quad(image, loose)
    assert completed is not None
    assert _close(completed, _PAPER, 12)


def test_complete_ticket_quad_rejects_a_blank_region():
    image = np.full((600, 800, 3), 120, dtype=np.uint8)
    assert paper_outline.complete_ticket_quad(image, [(100, 100), (400, 100), (400, 300), (100, 300)]) is None


def test_ticket_split_by_the_detector_is_merged_into_one_sheet():
    image = _two_tone_ticket(_desk(), _PAPER)
    upper = [(300, 300), (900, 300), (900, 500), (300, 500)]
    lower = [(300, 480), (650, 480), (650, 620), (300, 620)]
    completed = [paper_outline.complete_ticket_quad(image, q) or q for q in (upper, lower)]
    merged = paper_outline.merge_ticket_quads(image, completed)
    assert len(merged) == 1
    quad, members = merged[0]
    assert members == [0, 1]
    assert _close(quad, _PAPER, 15)


def test_separate_tickets_are_not_merged():
    image = _desk(size=(1000, 1200))
    first = [(100, 100), (600, 100), (600, 380), (100, 380)]
    second = [(650, 560), (1150, 560), (1150, 840), (650, 840)]
    _two_tone_ticket(image, first)
    _two_tone_ticket(image, second)
    completed = [paper_outline.complete_ticket_quad(image, q) or q for q in (first, second)]
    merged = paper_outline.merge_ticket_quads(image, completed)
    assert [members for _, members in merged] == [[0], [1]]


# --- service ----------------------------------------------------------------------


class _RecordingOcr(OcrStrategy):
    name = "recording-stub"

    def __init__(self, whole: list[OcrTextResult]):
        self._whole = whole
        self.field_images: list[np.ndarray] = []

    def read_text(self, image, languages=DEFAULT_LANGUAGES, *, field_hint=None):
        if field_hint is None:
            return list(self._whole)
        self.field_images.append(image)
        return []


def _service(ocr: OcrStrategy) -> TicketScanService:
    return TicketScanService(
        detector_provider=None,
        ocr_strategy=ocr,
        validator=FormatValidator(),
        max_file_size_mb=10,
        max_image_dimension=1920,
        station_fuzzy_threshold=80,
        high_confidence_threshold=0.9,
        low_confidence_threshold=0.5,
        include_cropped_image=False,
    )


def test_yolo_boxes_become_complete_merged_tickets():
    image = _two_tone_ticket(_desk(), _PAPER)
    # Detector image at half scale; YOLO split the ticket in two.
    yolo = SimpleNamespace(
        ticket_boxes=[(150, 150, 300, 100), (150, 240, 175, 70)],
        ticket_corners=[
            [(150, 150), (450, 150), (450, 250), (150, 250)],
            [(150, 240), (325, 240), (325, 310), (150, 310)],
        ],
    )
    raw = TicketScanService._ticket_outlines(yolo, image, 2.0, complete=False)
    assert [o.paper_quad for o in raw] == [None, None]

    outlines = TicketScanService._ticket_outlines(yolo, image, 2.0, complete=True)
    assert len(outlines) == 1
    ticket = outlines[0]
    assert ticket.detection_index == 0
    assert _close(ticket.paper_quad, _PAPER, 15)
    assert _close(ticket.corners, [(x / 2, y / 2) for x, y in _PAPER], 8)
    x, y, w, h = ticket.bbox
    assert (x, y) == pytest.approx((150, 150), abs=8)
    assert (w, h) == pytest.approx((300, 160), abs=10)


def test_template_boxes_map_onto_the_whole_sheet_inside_the_margin(sample_stations):
    image = _two_tone_ticket(_desk(), _PAPER)
    template = StationTemplateMetadata(
        stationId=2,
        templateId=40,
        fieldLayouts=[
            FieldLayoutMetadata(id=1, fieldName="numbers", priority=1, x=0.1, y=0.62, width=0.8, height=0.3),
        ],
    )
    ocr = _RecordingOcr(whole=[OcrTextResult(text="Cần Thơ", confidence=0.95, x_center=0.5, y_center=0.1)])
    service = _service(ocr)
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)
    ctx = _TemplateContext(stations=sample_stations, station_templates=[template])
    yolo_quad = [(300, 300), (900, 300), (900, 500), (300, 500)]  # upper part only
    region = DetectedRegion(bbox=(300, 300, 600, 200), corners=yolo_quad)

    result = service._scan_one_region_with_template(
        image, region, 0, parser, {}, ctx, fallback_region=region, fallback_field_boxes={},
        paper_quad=[(float(x), float(y)) for x, y in _PAPER],
    )

    # Crop = sheet + margin on every side; the box sits on the sheet, not the YOLO box.
    m = _COMPLETE_TICKET_CROP_MARGIN
    crop_w, crop_h = 600 * (1 + 2 * m), 320 * (1 + 2 * m)
    box = result.fieldBoxes["numbers"]
    assert box.x == pytest.approx((m + 0.1) / (1 + 2 * m) * crop_w, abs=3)
    assert box.y == pytest.approx((m + 0.62) / (1 + 2 * m) * crop_h, abs=3)
    assert box.width == pytest.approx(0.8 / (1 + 2 * m) * crop_w, abs=3)
    source = result.sourceFieldBoxes["numbers"]
    assert source.x == pytest.approx(300 + 0.1 * 600, abs=3)
    assert source.y == pytest.approx(300 + 0.62 * 320, abs=3)


def test_template_fields_are_read_from_the_processed_crop():
    ocr = _RecordingOcr(whole=[])
    service = _service(ocr)
    # Processed crop: white where the region lies, unlike anything on the upload.
    preview = np.zeros((400, 800, 3), np.uint8)
    preview[200:300, 400:600] = 255
    crop = ProcessedTicketCrop(
        preview=preview,
        ocr_ready=preview.copy(),
        source_quad=[(1000, 1000), (1400, 1000), (1400, 1200), (1000, 1200)],
    )
    placement = _TemplatePlacement(
        regions=[], to_upload=_unit_square_to(crop.source_quad), method="outline"
    )
    region = locator.TemplateRegion(
        field_name="numbers", priority=1, x=0.5, y=0.5, width=0.25, height=0.25, layout_id=None
    )
    parser = TicketParser(StationMatcher([]), station_fuzzy_threshold=80)

    service._ocr_crop_region(crop, placement, region, "numbers", parser, None)

    assert ocr.field_images
    patch = ocr.field_images[0]
    assert patch.mean() > 180  # the region's white block, padded slightly


_FRAMED_TEMPLATE = StationTemplateMetadata(
    stationId=2,
    templateId=41,
    fieldLayouts=[
        FieldLayoutMetadata(id=1, fieldName="ticketFrame", priority=1, x=0.3, y=0.375, width=0.6, height=0.4),
        FieldLayoutMetadata(id=2, fieldName="numbers", priority=1, x=0.4, y=0.6, width=0.4, height=0.1),
    ],
)


def test_registered_template_recuts_the_whole_ticket_it_places():
    upload = _two_tone_ticket(_desk(), _PAPER)
    # Sample photo 1000x800 registered 1:1: its ticketFrame is exactly the sheet.
    placement = _TemplatePlacement(
        regions=[], to_upload=np.diag([1000.0, 800.0, 1.0]), method="registered"
    )
    service = _service(_RecordingOcr(whole=[]))

    crop = service._registered_ticket_crop(_FRAMED_TEMPLATE, placement, upload)

    assert crop is not None
    assert _close(crop.paper_quad, _PAPER, 1)
    assert _close(crop.source_quad, paper_outline.expand_quad(_PAPER, _COMPLETE_TICKET_CROP_MARGIN), 1)
    m = _COMPLETE_TICKET_CROP_MARGIN
    assert crop.preview.shape[:2] == pytest.approx((320 * (1 + 2 * m), 600 * (1 + 2 * m)), abs=2)


def test_unregistered_placement_keeps_the_detected_crop():
    placement = _TemplatePlacement(
        regions=[], to_upload=_unit_square_to(_PAPER), method="paper"
    )
    service = _service(_RecordingOcr(whole=[]))
    assert service._registered_ticket_crop(_FRAMED_TEMPLATE, placement, _desk()) is None


def test_whole_ticket_lines_follow_the_ticket_into_the_recut_crop():
    blank = np.zeros((10, 10, 3), np.uint8)
    old = ProcessedTicketCrop(blank, blank, source_quad=[(0, 0), (100, 0), (100, 100), (0, 100)])
    new = ProcessedTicketCrop(blank, blank, source_quad=[(50, 0), (150, 0), (150, 100), (50, 100)])
    line = OcrTextResult(text="123456", confidence=0.9, x_center=0.75, y_center=0.5)

    (moved,) = _relocate_crop_lines([line], old, new)

    assert (moved.x_center, moved.y_center) == pytest.approx((0.25, 0.5))
    assert moved.text == "123456"


class _TwoModeOcr(OcrStrategy):
    """Region cut read plainly vs in field-crop mode (field_hint set)."""

    name = "two-mode-stub"

    def __init__(self, plain: list[OcrTextResult], field_crop: list[OcrTextResult]):
        self._plain = plain
        self._field_crop = field_crop
        self.modes: list[str] = []

    def read_text(self, image, languages=DEFAULT_LANGUAGES, *, field_hint=None):
        self.modes.append("plain" if field_hint is None else "field")
        return list(self._plain if field_hint is None else self._field_crop)


def _read_region(ocr: OcrStrategy, field_name: str, expected_length: int | None = None):
    preview = np.full((400, 800, 3), 200, np.uint8)
    crop = ProcessedTicketCrop(
        preview=preview,
        ocr_ready=preview.copy(),
        source_quad=[(0, 0), (800, 0), (800, 400), (0, 400)],
    )
    placement = _TemplatePlacement(
        regions=[], to_upload=_unit_square_to(crop.source_quad), method="registered"
    )
    region = locator.TemplateRegion(
        field_name=field_name, priority=1, x=0.3, y=0.4, width=0.4, height=0.15, layout_id=None
    )
    parser = TicketParser(StationMatcher([]), station_fuzzy_threshold=80)
    return _service(ocr)._ocr_crop_region(crop, placement, region, field_name, parser, expected_length)


def _lines(text: str, confidence: float = 0.9) -> list[OcrTextResult]:
    return [OcrTextResult(text=text, confidence=confidence)]


def test_number_region_is_read_plainly_before_field_crop_mode():
    ocr = _TwoModeOcr(plain=_lines("108258"), field_crop=_lines("1108258"))
    assert [line.text for line in _read_region(ocr, "numbers", 6)] == ["108258"]
    assert ocr.modes == ["plain"]


def test_field_crop_mode_retries_a_plain_read_of_the_wrong_shape():
    ocr = _TwoModeOcr(plain=_lines("10825"), field_crop=_lines("108258"))
    assert [line.text for line in _read_region(ocr, "numbers", 6)] == ["108258"]
    assert ocr.modes == ["plain", "field"]


def test_batch_region_keeps_field_crop_mode_first():
    ocr = _TwoModeOcr(plain=_lines("O6D", 0.86), field_crop=_lines("06D", 0.34))
    assert [line.text for line in _read_region(ocr, "batchCode")] == ["06D"]
    assert ocr.modes[0] == "field"
