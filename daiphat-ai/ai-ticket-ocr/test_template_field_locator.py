"""Legacy template strategy: station template selection, anchor alignment,
line → region assignment, metadata parsing and the service flow."""

from __future__ import annotations

import numpy as np
import pytest

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult
from domain.parsing.ticket_parser import TicketParser
from domain.scanning import template_field_locator as locator
from domain.stations.matcher import StationMatcher
from dto.request.scan_metadata import FieldLayoutMetadata, ScanMetadata, StationTemplateMetadata

cv2 = pytest.importorskip("cv2")

from domain.detection.base import DetectedRegion  # noqa: E402
from domain.scanning.ticket_scan_service import TicketScanService, _TemplateContext  # noqa: E402
from domain.validation.format_validator import FormatValidator  # noqa: E402


def _layout(field_name, x, y, w, h, priority=1, layout_id=None):
    return FieldLayoutMetadata(
        id=layout_id, fieldName=field_name, priority=priority, x=x, y=y, width=w, height=h
    )


def _line(text, x, y, conf=0.95):
    return OcrTextResult(text=text, confidence=conf, x_center=x, y_center=y)


# --- regions / template selection -------------------------------------------------


def test_regions_from_layouts_maps_price_and_drops_invalid_boxes():
    regions = locator.regions_from_layouts(
        [
            _layout("price", 0.7, 0.05, 0.25, 0.1),
            _layout("numbers", 0.1, 0.45, 0.8, 0.2, priority=2, layout_id=9),
            _layout("numbers", 0.1, 0.40, 0.8, 0.2, priority=1, layout_id=8),
            _layout("unknownField", 0.1, 0.1, 0.1, 0.1),
            _layout("serialNumber", 0.1, 0.1, 0.0, 0.1),
            _layout("drawDate", 0.9, 0.9, 0.3, 0.3),  # clipped to the ticket
        ]
    )
    names = [r.field_name for r in regions]
    assert "ticketType" in names
    assert "unknownField" not in names
    assert "serialNumber" not in names
    numbers = [r for r in regions if r.field_name == "numbers"]
    assert [r.layout_id for r in numbers] == [8, 9]
    draw = next(r for r in regions if r.field_name == "drawDate")
    assert draw.x + draw.width <= 1.0 and draw.y + draw.height <= 1.0


def _photo(frame, fx, fy, fw, fh):
    """Frame-relative box → coordinates on a sample photo with background."""
    x, y, w, h = frame
    return x + fx * w, y + fy * h, fw * w, fh * h


def test_ticket_frame_makes_regions_frame_relative_and_drops_outside_boxes():
    frame = (0.2, 0.3, 0.6, 0.4)
    layouts = [
        _layout("ticketFrame", *frame),
        _layout("numbers", *_photo(frame, 0.1, 0.45, 0.8, 0.2)),
        _layout("serialNumber", 0.02, 0.05, 0.1, 0.05),  # on the desk, outside the frame
    ]
    parsed_frame = locator.template_frame(layouts)
    assert (parsed_frame.x, parsed_frame.y, parsed_frame.width, parsed_frame.height) == pytest.approx(frame)
    regions = locator.regions_from_layouts(layouts)
    assert [r.field_name for r in regions] == ["numbers"]
    numbers = regions[0]
    assert (numbers.x, numbers.y, numbers.width, numbers.height) == pytest.approx((0.1, 0.45, 0.8, 0.2))


def test_template_without_frame_keeps_photo_coordinates():
    regions = locator.regions_from_layouts([_layout("numbers", 0.26, 0.48, 0.48, 0.08)])
    assert (regions[0].x, regions[0].y) == pytest.approx((0.26, 0.48))
    assert locator.template_frame([_layout("ticketFrame", 0.1, 0.1, 0.01, 0.5)]) is None


def test_select_station_template_matches_station_id_only():
    templates = [
        StationTemplateMetadata(stationId=1, templateId=11, fieldLayouts=[_layout("numbers", 0, 0, 1, 1)]),
        StationTemplateMetadata(stationId=2, templateId=22, fieldLayouts=[]),
    ]
    assert locator.select_station_template(1, templates).templateId == 11
    assert locator.select_station_template(2, templates) is None
    assert locator.select_station_template(None, templates) is None
    assert locator.select_station_template(3, templates) is None


# --- paper outline ----------------------------------------------------------------


def _desk_photo(paper_quad, size=(900, 1200)):
    """Speckled grey desk with a bright, patterned ticket at ``paper_quad``."""
    rng = np.random.default_rng(7)
    h, w = size
    image = rng.integers(90, 140, size=(h, w, 3), dtype=np.uint8)
    pts = np.int32(paper_quad).reshape(-1, 1, 2)
    cv2.fillPoly(image, [pts], (235, 215, 170))
    x0, y0 = np.int32(paper_quad).min(axis=0)
    x1, y1 = np.int32(paper_quad).max(axis=0)
    cv2.rectangle(image, (int(x0 + 60), int(y0 + 40)), (int(x1 - 60), int(y0 + 90)), (150, 60, 200), -1)
    return image


def test_refine_paper_quad_snaps_loose_outline_to_paper_edges():
    from domain.scanning import paper_outline

    paper = [(300, 300), (900, 310), (895, 610), (296, 600)]
    image = _desk_photo(paper)
    loose = [(250, 260), (950, 260), (950, 660), (250, 660)]
    snapped = paper_outline.refine_paper_quad(image, loose)
    assert snapped is not None
    for (sx, sy), (px, py) in zip(snapped, paper):
        assert abs(sx - px) <= 8 and abs(sy - py) <= 8


def test_refine_paper_quad_rejects_blank_region():
    from domain.scanning import paper_outline

    image = np.full((400, 600, 3), 120, dtype=np.uint8)
    assert paper_outline.refine_paper_quad(image, [(10, 10), (20, 10), (20, 20), (10, 20)]) is None


def test_regions_are_relative_to_sample_paper_not_loose_frame():
    # Loose frame with desk margins around the paper, like the Admin screenshot.
    size = (900, 1200)
    paper_px = [(300, 300), (900, 300), (900, 600), (300, 600)]
    sample = _desk_photo(paper_px, size=size)
    h, w = size
    frame = (230 / w, 280 / h, 730 / w, 360 / h)
    # Date box drawn over paper-relative (0.70..0.90, 0.40..0.50).
    date_box = (
        (300 + 0.70 * 600) / w, (300 + 0.40 * 300) / h, (0.20 * 600) / w, (0.10 * 300) / h
    )
    layouts = [_layout("ticketFrame", *frame), _layout("drawDate", *date_box)]

    paper_quad = locator.template_paper_quad(layouts, sample)
    assert paper_quad is not None
    region = locator.regions_from_layouts(layouts, paper_quad)[0]
    assert (region.x, region.y, region.width, region.height) == pytest.approx(
        (0.70, 0.40, 0.20, 0.10), abs=0.015
    )
    # Frame-relative placement is off by the desk margin.
    loose = locator.regions_from_layouts(layouts)[0]
    assert abs(loose.width - 0.20) > 0.03


# --- assignment -------------------------------------------------------------------


def _located(lines):
    return [(line, line.x_center, line.y_center) for line in lines]


def test_lines_by_region_uses_centres_and_keeps_raw_text():
    numbers = locator.TemplateRegion("numbers", 1, 0.1, 0.45, 0.8, 0.2)
    draw_date = locator.TemplateRegion("drawDate", 1, 0.05, 0.75, 0.5, 0.1)
    serial = locator.TemplateRegion("serialNumber", 1, 0.1, 0.30, 0.8, 0.1)
    lines = [
        _line("1 2 3 4 5 6", 0.5, 0.55),
        _line("05/08/2026", 0.3, 0.80),
        _line("188435 S", 0.5, 0.34),
        _line("Giải đặc biệt", 0.9, 0.02),  # outside every region
    ]
    grouped = locator.lines_by_region(_located(lines), [numbers, draw_date, serial])
    assert [r.text for r in grouped[numbers]] == ["1 2 3 4 5 6"]
    assert [r.text for r in grouped[draw_date]] == ["05/08/2026"]
    assert [r.text for r in grouped[serial]] == ["188435 S"]
    assert sum(len(v) for v in grouped.values()) == 3


def test_large_region_does_not_swallow_neighbouring_text():
    # Big lottery-number box; the left panel prints ký hiệu + draw date beside it.
    numbers = locator.TemplateRegion("numbers", 1, 0.23, 0.55, 0.62, 0.43)
    lines = [
        _line("4 2 4 9 4 4", 0.55, 0.78),
        _line("23-08-2026", 0.12, 0.90),
        _line("Vé 8K4", 0.14, 0.72),
    ]
    grouped = locator.lines_by_region(_located(lines), [numbers])
    assert [r.text for r in grouped[numbers]] == ["4 2 4 9 4 4"]


def test_text_marked_for_several_fields_belongs_to_each_region():
    # Kiên Giang: "A 424944" top-right is marked as both serial and number.
    serial = locator.TemplateRegion("serialNumber", 3, 0.64, 0.51, 0.2, 0.04)
    numbers = locator.TemplateRegion("numbers", 2, 0.68, 0.51, 0.16, 0.04)
    grouped = locator.lines_by_region(_located([_line("A424944", 0.75, 0.53)]), [serial, numbers])
    assert set(grouped) == {serial, numbers}


# --- metadata ---------------------------------------------------------------------


def test_scan_metadata_parses_station_templates():
    metadata = ScanMetadata.model_validate(
        {
            "activeStations": [{"id": 2, "name": "Cần Thơ", "code": "CTH"}],
            "templateId": 5,
            "fieldLayouts": [],
            "stationTemplates": [
                {
                    "stationId": 2,
                    "templateId": 22,
                    "fieldLayouts": [
                        {"id": 1, "fieldName": "numbers", "priority": 1,
                         "x": 0.1, "y": 0.4, "width": 0.8, "height": 0.2, "required": True}
                    ],
                }
            ],
        }
    )
    assert metadata.stationTemplates[0].stationId == 2
    assert metadata.stationTemplates[0].fieldLayouts[0].fieldName == "numbers"
    assert ScanMetadata().stationTemplates == []


# --- service flow -----------------------------------------------------------------


class _FieldHintOcr(OcrStrategy):
    """Whole-ticket read vs per-field crop reads, keyed by field_hint."""

    name = "field-hint-stub"

    def __init__(self, whole: list[OcrTextResult], by_field: dict[str, list[OcrTextResult]]):
        self._whole = whole
        self._by_field = by_field
        self.calls: list[str | None] = []

    def read_text(self, image, languages=DEFAULT_LANGUAGES, *, field_hint=None):
        self.calls.append(field_hint)
        if field_hint is None:
            return list(self._whole)
        return list(self._by_field.get(field_hint, []))


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


def _ticket_region(w=400, h=800):
    image = np.full((h, w, 3), 200, dtype=np.uint8)
    region = DetectedRegion(bbox=(0, 0, w, h), corners=[(0, 0), (w - 1, 0), (w - 1, h - 1), (0, h - 1)])
    return image, region


_TEMPLATE = StationTemplateMetadata(
    stationId=2,
    templateId=22,
    fieldLayouts=[
        _layout("stationName", 0.1, 0.04, 0.8, 0.12),
        _layout("serialNumber", 0.1, 0.30, 0.8, 0.10),
        _layout("numbers", 0.1, 0.45, 0.8, 0.20),
        _layout("drawDate", 0.05, 0.75, 0.5, 0.10),
    ],
)

_WHOLE_LINES = [
    _line("Cần Thơ", 0.5, 0.10),
    _line("1 2 3 4 5 6", 0.5, 0.55),
    _line("05/08/2026", 0.3, 0.80),
    _line("188435", 0.5, 0.35, conf=0.9),  # letter dropped → re-OCR serial crop
]


def test_template_strategy_uses_station_template_and_reocrs_weak_fields(sample_stations):
    ocr = _FieldHintOcr(
        whole=_WHOLE_LINES,
        by_field={"serialNumber": [OcrTextResult(text="188435S", confidence=0.9)]},
    )
    service = _service(ocr)
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)
    image, region = _ticket_region()
    ctx = _TemplateContext(stations=sample_stations, station_templates=[_TEMPLATE])

    result = service._scan_one_region_with_template(
        image, region, 0, parser, {}, ctx, fallback_region=region, fallback_field_boxes={}
    )

    assert result.extracted.stationCode == "CTH"
    assert result.extracted.numbers == "123456"
    assert result.extracted.drawDate == "2026-08-05"
    assert result.extracted.serialNumber == "188435S"
    # Numbers/date came from the whole read; only the serial crop was re-OCR'd.
    assert [hint for hint in ocr.calls if hint is not None] == ["serialNumber"]
    assert {"numbers", "drawDate", "serialNumber", "stationName"} <= set(result.fieldBoxes)
    numbers_box = result.fieldBoxes["numbers"]
    assert 0.40 * 800 <= numbers_box.y <= 0.55 * 800


def test_template_strategy_maps_fields_through_ticket_frame(sample_stations):
    # Sample photo: ticket occupies the middle of a desk shot (like Admin uploads).
    frame = (0.15, 0.25, 0.7, 0.5)
    template = StationTemplateMetadata(
        stationId=2,
        templateId=23,
        fieldLayouts=[
            _layout("ticketFrame", *frame),
            _layout("stationName", *_photo(frame, 0.1, 0.04, 0.8, 0.12)),
            _layout("serialNumber", *_photo(frame, 0.1, 0.30, 0.8, 0.10)),
            _layout("numbers", *_photo(frame, 0.1, 0.45, 0.8, 0.20)),
            _layout("drawDate", *_photo(frame, 0.05, 0.75, 0.5, 0.10)),
        ],
    )
    ocr = _FieldHintOcr(
        whole=_WHOLE_LINES,
        by_field={"serialNumber": [OcrTextResult(text="188435S", confidence=0.9)]},
    )
    service = _service(ocr)
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)
    image, region = _ticket_region()
    ctx = _TemplateContext(stations=sample_stations, station_templates=[template])

    result = service._scan_one_region_with_template(
        image, region, 0, parser, {}, ctx, fallback_region=region, fallback_field_boxes={}
    )

    assert result.extracted.numbers == "123456"
    assert result.extracted.drawDate == "2026-08-05"
    assert result.extracted.serialNumber == "188435S"
    numbers_box = result.fieldBoxes["numbers"]
    # Frame-relative y≈0.45..0.65 of the warped ticket, not photo-relative 0.475..0.575.
    assert 0.40 * 800 <= numbers_box.y <= 0.50 * 800
    assert numbers_box.height >= 0.15 * 800
    assert "ticketFrame" not in result.fieldBoxes


def test_returned_field_boxes_are_the_exact_template_regions(sample_stations):
    ocr = _FieldHintOcr(
        whole=_WHOLE_LINES,
        by_field={"serialNumber": [OcrTextResult(text="188435S", confidence=0.9)]},
    )
    service = _service(ocr)
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)
    image, region = _ticket_region()
    ctx = _TemplateContext(stations=sample_stations, station_templates=[_TEMPLATE])

    result = service._scan_one_region_with_template(
        image, region, 0, parser, {}, ctx, fallback_region=region, fallback_field_boxes={}
    )

    w, h = 399, 799  # warp of the (0,0)-(399,799) ticket quad
    for layout in _TEMPLATE.fieldLayouts:
        box = result.fieldBoxes[layout.fieldName]
        assert box.x == pytest.approx(layout.x * w, abs=1)
        assert box.y == pytest.approx(layout.y * h, abs=1)
        assert box.width == pytest.approx(layout.width * w, abs=1)
        assert box.height == pytest.approx(layout.height * h, abs=1)


def test_template_path_maps_sample_paper_onto_scanned_paper(sample_stations):
    sample_size = (900, 1200)
    sample_paper = [(300, 300), (900, 300), (900, 600), (300, 600)]
    sample = _desk_photo(sample_paper, size=sample_size)
    sh, sw = sample_size

    def on_sample(fx, fy, fw, fh):
        return (300 + fx * 600) / sw, (300 + fy * 300) / sh, fw * 600 / sw, fh * 300 / sh

    template = StationTemplateMetadata(
        stationId=2,
        templateId=26,
        sampleImageUrl="https://example.test/sample.jpg",
        fieldLayouts=[
            # Loose frame: asymmetric desk margins around the paper.
            _layout("ticketFrame", 230 / sw, 280 / sh, 730 / sw, 360 / sh),
            _layout("stationName", *on_sample(0.25, 0.05, 0.50, 0.15), layout_id=31),
            _layout("drawDate", *on_sample(0.70, 0.40, 0.20, 0.10), layout_id=32),
        ],
    )
    # Upload: same ticket elsewhere in a bigger photo; YOLO outline a bit loose.
    scan_paper = [(400, 500), (1600, 500), (1600, 1100), (400, 1100)]
    upload = _desk_photo(scan_paper, size=(1600, 2000))
    yolo_quad = [(385, 480), (1625, 485), (1620, 1125), (380, 1120)]
    region = DetectedRegion(bbox=(380, 480, 1245, 645), corners=yolo_quad)

    ocr = _FieldHintOcr(whole=[_line("Cần Thơ", 0.5, 0.12)], by_field={"drawDate": [_line("05/08/2026", 0.5, 0.5)]})
    service = TicketScanService(
        detector_provider=None,
        ocr_strategy=ocr,
        validator=FormatValidator(),
        max_file_size_mb=10,
        max_image_dimension=1920,
        station_fuzzy_threshold=80,
        high_confidence_threshold=0.9,
        low_confidence_threshold=0.5,
        include_cropped_image=False,
        template_sample_loader=lambda url: sample,
    )
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)
    ctx = _TemplateContext(stations=sample_stations, station_templates=[template])

    # Detector coords at half scale; the template path warps from the original.
    half = DetectedRegion(
        bbox=tuple(v // 2 for v in region.bbox), corners=[(x // 2, y // 2) for x, y in yolo_quad]
    )
    result = service._scan_one_region_with_template(
        cv2.resize(upload, None, fx=0.5, fy=0.5), half, 0, parser, {}, ctx,
        fallback_region=half, fallback_field_boxes={}, source=upload, source_scale=2.0,
    )

    assert result.extracted.drawDate == "2026-08-05"
    assert result.usedFieldLayouts == {"stationName": 31, "drawDate": 32}
    # Scanned paper spans (400..1600, 500..1100) on the upload; the box lands on
    # paper-relative (0.70, 0.40, 0.20, 0.10), reported in detector (half) pixels.
    date_box = result.sourceFieldBoxes["drawDate"]
    assert date_box.x == pytest.approx((400 + 0.70 * 1200) / 2, abs=10)
    assert date_box.y == pytest.approx((500 + 0.40 * 600) / 2, abs=6)
    assert date_box.width == pytest.approx(0.20 * 1200 / 2, abs=10)
    assert date_box.height == pytest.approx(0.10 * 600 / 2, abs=6)
    assert len(date_box.corners) == 4


def _textured_ticket(width=600, height=300):
    rng = np.random.default_rng(11)
    ticket = cv2.resize(
        rng.integers(0, 255, size=(height // 6, width // 6, 3), dtype=np.uint8),
        (width, height),
        interpolation=cv2.INTER_NEAREST,
    )
    for i in range(12):
        cv2.putText(ticket, f"{i * 7919 % 100000:05d}", (20 + 45 * (i % 12), 40 + 20 * (i % 11)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    return ticket


def _place(ticket, quad, size):
    th, tw = ticket.shape[:2]
    src = np.float32([[0, 0], [tw, 0], [tw, th], [0, th]])
    matrix = cv2.getPerspectiveTransform(src, np.float32(quad))
    background = np.full((size[0], size[1], 3), 110, dtype=np.uint8)
    warped = cv2.warpPerspective(ticket, matrix, (size[1], size[0]))
    mask = cv2.warpPerspective(np.full((th, tw), 255, np.uint8), matrix, (size[1], size[0]))
    background[mask > 0] = warped[mask > 0]
    return background


def test_template_regions_follow_the_registered_sample_onto_the_original(sample_stations):
    ticket = _textured_ticket()
    sample_quad = [(300, 300), (900, 300), (900, 600), (300, 600)]
    sample = _place(ticket, sample_quad, (900, 1200))
    sh, sw = 900, 1200

    def on_sample(fx, fy, fw, fh):
        return (300 + fx * 600) / sw, (300 + fy * 300) / sh, fw * 600 / sw, fh * 300 / sh

    template = StationTemplateMetadata(
        stationId=2,
        templateId=28,
        sampleImageUrl="https://example.test/textured.jpg",
        fieldLayouts=[
            _layout("ticketFrame", 250 / sw, 270 / sh, 700 / sw, 360 / sh),
            _layout("drawDate", *on_sample(0.70, 0.40, 0.20, 0.10), layout_id=51),
        ],
    )
    # Upload: tilted, scaled copy; the YOLO outline is loose around it.
    scan_quad = [(420, 520), (1580, 480), (1600, 1080), (400, 1110)]
    upload = _place(ticket, scan_quad, (1600, 2000))
    yolo_quad = [(380, 450), (1640, 450), (1640, 1140), (380, 1140)]
    region = DetectedRegion(bbox=(380, 450, 1260, 690), corners=yolo_quad)

    ocr = _FieldHintOcr(whole=[_line("Cần Thơ", 0.5, 0.12)], by_field={"drawDate": [_line("05/08/2026", 0.5, 0.5)]})
    service = TicketScanService(
        detector_provider=None,
        ocr_strategy=ocr,
        validator=FormatValidator(),
        max_file_size_mb=10,
        max_image_dimension=1920,
        station_fuzzy_threshold=80,
        high_confidence_threshold=0.9,
        low_confidence_threshold=0.5,
        include_cropped_image=False,
        template_sample_loader=lambda url: sample,
    )
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)
    ctx = _TemplateContext(stations=sample_stations, station_templates=[template])
    registrations = []
    register = service._register_template
    service._register_template = lambda *args: registrations.append(register(*args)) or registrations[-1]

    result = service._scan_one_region_with_template(
        upload, region, 0, parser, {}, ctx, fallback_region=region, fallback_field_boxes={}
    )

    assert registrations and registrations[0] is not None
    assert result.extracted.drawDate == "2026-08-05"
    th, tw = ticket.shape[:2]
    to_scan = cv2.getPerspectiveTransform(
        np.float32([[0, 0], [tw, 0], [tw, th], [0, th]]), np.float32(scan_quad)
    )
    expected = cv2.perspectiveTransform(
        np.float32([[[0.70 * tw, 0.40 * th]], [[0.90 * tw, 0.40 * th]], [[0.90 * tw, 0.50 * th]], [[0.70 * tw, 0.50 * th]]]),
        to_scan,
    ).reshape(-1, 2)
    corners = np.float32(result.sourceFieldBoxes["drawDate"].corners)
    assert np.abs(corners - expected).max() <= 6


def test_template_boxes_are_the_source_of_truth(sample_stations):
    # Kiên Giang-style layout: number bottom-right, ký hiệu + draw date printed
    # both in the left panel and in the right column the template marks.
    template = StationTemplateMetadata(
        stationId=2,
        templateId=24,
        fieldLayouts=[
            _layout("stationName", 0.25, 0.03, 0.55, 0.12),
            _layout("serialNumber", 0.02, 0.20, 0.15, 0.30),
            _layout("batchCode", 0.76, 0.20, 0.22, 0.09),
            _layout("drawDate", 0.76, 0.30, 0.22, 0.10),
            _layout("numbers", 0.23, 0.55, 0.62, 0.43),
        ],
    )
    whole = [
        _line("Cần Thơ", 0.5, 0.08),
        _line("A424944", 0.09, 0.35),
        _line("8K4", 0.87, 0.25),
        _line("23-08-2026", 0.87, 0.35),
        _line("4 2 4 9 4 4", 0.55, 0.78),
        # Left panel, outside every template box: whole-ticket heuristics
        # used to pick these (date digits → "230820", fake ký hiệu).
        _line("50K1", 0.12, 0.80),
        _line("23082026", 0.12, 0.90),
    ]
    ocr = _FieldHintOcr(whole=whole, by_field={})
    service = _service(ocr)
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)
    image, region = _ticket_region()
    ctx = _TemplateContext(stations=sample_stations, station_templates=[template])

    result = service._scan_one_region_with_template(
        image, region, 0, parser, {}, ctx, fallback_region=region, fallback_field_boxes={}
    )

    assert result.extracted.numbers == "424944"
    assert result.extracted.drawDate == "2026-08-23"
    assert result.extracted.batchCode == "8K4"
    assert result.extracted.serialNumber == "A424944"
    assert [hint for hint in ocr.calls if hint is not None] == []


def test_clean_copy_in_later_priority_beats_stylized_first_region(sample_stations):
    # Kiên Giang: big stylized digits (#1) read badly; "A 424944" top-right
    # is also marked for the number (#2) and the serial (#2), beside the price.
    template = StationTemplateMetadata(
        stationId=2,
        templateId=27,
        fieldLayouts=[
            _layout("stationName", 0.25, 0.03, 0.45, 0.12),
            _layout("ticketType", 0.72, 0.03, 0.2, 0.12),
            _layout("numbers", 0.23, 0.55, 0.62, 0.43, priority=1, layout_id=41),
            _layout("numbers", 0.66, 0.16, 0.24, 0.12, priority=2, layout_id=42),
            _layout("serialNumber", 0.02, 0.20, 0.10, 0.40, priority=1, layout_id=43),
            _layout("serialNumber", 0.62, 0.14, 0.30, 0.14, priority=2, layout_id=44),
            _layout("batchCode", 0.72, 0.30, 0.2, 0.08, priority=1, layout_id=45),
            _layout("batchCode", 0.05, 0.62, 0.15, 0.08, priority=2, layout_id=46),
        ],
    )
    whole = [
        _line("Cần Thơ", 0.45, 0.08),
        _line("10.000", 0.80, 0.14, conf=0.9),  # price, inside the serial margin
        _line("A424944", 0.78, 0.22, conf=0.99),
        _line("SK4", 0.82, 0.34, conf=0.84),  # "8K4" misread
        _line("Vé8K4", 0.12, 0.66, conf=0.88),
        _line("192190121", 0.55, 0.78, conf=0.55),
    ]
    ocr = _FieldHintOcr(whole=whole, by_field={})
    service = _service(ocr)
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)
    image, region = _ticket_region(w=800, h=400)
    ctx = _TemplateContext(stations=sample_stations, station_templates=[template])

    result = service._scan_one_region_with_template(
        image, region, 0, parser, {}, ctx, fallback_region=region, fallback_field_boxes={}
    )

    assert result.extracted.numbers == "424944"
    assert result.extracted.serialNumber == "A424944"
    assert result.extracted.batchCode == "8K4"
    assert result.usedFieldLayouts["numbers"] == 42
    assert result.usedFieldLayouts["serialNumber"] == 44
    assert result.usedFieldLayouts["batchCode"] == 46


def test_template_field_left_empty_rather_than_guessed_elsewhere(sample_stations):
    template = StationTemplateMetadata(
        stationId=2,
        templateId=25,
        fieldLayouts=[
            _layout("stationName", 0.1, 0.04, 0.8, 0.12),
            _layout("numbers", 0.1, 0.45, 0.8, 0.20),
            _layout("batchCode", 0.76, 0.20, 0.22, 0.09),
        ],
    )
    whole = [
        _line("Cần Thơ", 0.5, 0.10),
        _line("1 2 3 4 5 6", 0.5, 0.55),
        _line("50K1", 0.12, 0.85),  # outside the ký hiệu box
    ]
    service = _service(_FieldHintOcr(whole=whole, by_field={}))
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)
    image, region = _ticket_region()
    ctx = _TemplateContext(stations=sample_stations, station_templates=[template])

    result = service._scan_one_region_with_template(
        image, region, 0, parser, {}, ctx, fallback_region=region, fallback_field_boxes={}
    )

    assert result.extracted.numbers == "123456"
    assert result.extracted.batchCode is None


def test_template_strategy_falls_back_to_generic_without_station_template(sample_stations):
    ocr = _FieldHintOcr(
        whole=_WHOLE_LINES,
        by_field={"numbers": [OcrTextResult(text="123456", confidence=0.9)]},
    )
    service = _service(ocr)
    parser = TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)
    image, region = _ticket_region()
    ctx = _TemplateContext(stations=sample_stations, station_templates=[])

    result = service._scan_one_region_with_template(
        image, region, 0, parser, {}, ctx, fallback_region=region, fallback_field_boxes={}
    )

    assert result.extracted.stationCode == "CTH"
    assert result.extracted.numbers == "123456"
    # Generic heuristic bands were used instead of template boxes.
    assert "numbers" in result.fieldBoxes
    # Whole-ticket OCR from the template stage was reused, not repeated.
    assert ocr.calls.count(None) == 1
