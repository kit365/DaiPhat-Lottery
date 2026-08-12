import numpy as np
import pytest

from domain.layouts import yolo_field_layout
from domain.layouts.yolo_field_layout import FIELD_REGION_PREFIX, YoloFieldLayoutStrategy
from domain.ocr.base import OcrTextResult
from domain.parsing.ticket_parser import TicketParser
from domain.stations.matcher import StationMatcher

_CLASS_NAMES = {
    0: "Lottery-QR-Scan",
    1: "Lottery-Station",
    2: "Lottery-Ticket-Serial",
    3: "Lottery-ticket",
    4: "drawDate",
    5: "drawDays",
    6: "lottery station logo",
    7: "lotteryNumber",
    8: "price",
}


class _FakeObb:
    def __init__(self, boxes, cls, conf=None):
        self.xyxy = np.asarray(boxes, dtype="float32")
        self.cls = np.asarray(cls, dtype="float32")
        self.conf = np.asarray(conf if conf is not None else [0.9] * len(cls), dtype="float32")

    def __len__(self):
        return len(self.xyxy)


class _FakeResult:
    def __init__(self, obb, names=None):
        self.obb = obb
        self.names = names if names is not None else _CLASS_NAMES


class _FakeModel:
    def __init__(self, result=None, error=None):
        self._result = result
        self._error = error

    def predict(self, image, **kwargs):
        if self._error is not None:
            raise self._error
        return [self._result]


@pytest.fixture
def crop() -> np.ndarray:
    return np.zeros((600, 300, 3), dtype=np.uint8)


def _layout(model, monkeypatch) -> YoloFieldLayoutStrategy:
    monkeypatch.setattr(yolo_field_layout.yolo_model, "load_model", lambda path: model)
    return YoloFieldLayoutStrategy(
        model_path="unused-in-tests.pt",
        confidence_threshold=0.25,
        iou_threshold=0.45,
        device="cpu",
    )


def test_returns_a_crop_per_recognised_field(crop, monkeypatch):
    model = _FakeModel(
        _FakeResult(
            _FakeObb(
                boxes=[[20, 20, 280, 70], [30, 300, 270, 360], [40, 500, 260, 540]],
                cls=[1, 7, 2],  # Lottery-Station, lotteryNumber, Lottery-Ticket-Serial
            )
        )
    )

    regions = _layout(model, monkeypatch).get_regions(crop)

    assert f"{FIELD_REGION_PREFIX}stationName" in regions
    assert f"{FIELD_REGION_PREFIX}numbers" in regions
    assert f"{FIELD_REGION_PREFIX}serialNumber" in regions
    # The whole crop is always kept so the parser's positional heuristics and
    # any field the model missed still work.
    assert "whole" in regions


def test_ignores_classes_with_no_field_equivalent(crop, monkeypatch):
    model = _FakeModel(
        _FakeResult(_FakeObb(boxes=[[10, 10, 100, 60], [10, 80, 100, 130]], cls=[0, 6]))
    )

    regions = _layout(model, monkeypatch).get_regions(crop)

    assert not any(name.startswith(FIELD_REGION_PREFIX) for name in regions)


def test_keeps_only_the_most_confident_box_per_field(crop, monkeypatch):
    # The lottery number is commonly printed twice on a ticket.
    model = _FakeModel(
        _FakeResult(
            _FakeObb(boxes=[[10, 10, 200, 60], [10, 300, 290, 400]], cls=[7, 7], conf=[0.4, 0.95])
        )
    )

    regions = _layout(model, monkeypatch).get_regions(crop)

    numbers_crop = regions[f"{FIELD_REGION_PREFIX}numbers"]
    # The taller, higher-confidence box wins.
    assert numbers_crop.shape[0] > 60


def test_falls_back_to_the_generic_split_when_the_model_finds_nothing(crop, monkeypatch):
    model = _FakeModel(_FakeResult(_FakeObb(boxes=[], cls=[])))

    regions = _layout(model, monkeypatch).get_regions(crop)

    assert "header" in regions and "body" in regions


def test_falls_back_to_the_generic_split_when_inference_raises(crop, monkeypatch):
    model = _FakeModel(error=RuntimeError("boom"))

    regions = _layout(model, monkeypatch).get_regions(crop)

    assert "header" in regions and "body" in regions
    assert not any(name.startswith(FIELD_REGION_PREFIX) for name in regions)


def test_field_crops_stay_inside_the_image(crop, monkeypatch):
    # Padding must not push a box that already touches the edge out of bounds.
    model = _FakeModel(_FakeResult(_FakeObb(boxes=[[0, 0, 300, 60]], cls=[1])))

    regions = _layout(model, monkeypatch).get_regions(crop)

    station = regions[f"{FIELD_REGION_PREFIX}stationName"]
    assert station.shape[0] > 0 and station.shape[1] > 0
    assert station.shape[1] <= crop.shape[1]


# --- parser side: field-bound regions -------------------------------------


def _parser(sample_stations) -> TicketParser:
    return TicketParser(StationMatcher(sample_stations), 80)


def _line(text: str, confidence: float = 0.9) -> OcrTextResult:
    return OcrTextResult(text=text, confidence=confidence, y_center=0.5, x_center=0.5)


def test_field_region_binds_serial_directly(sample_stations):
    # The whole-ticket pass would have to tell this serial apart from every
    # other alnum token; a field crop removes the ambiguity entirely.
    parsed = _parser(sample_stations).parse({f"{FIELD_REGION_PREFIX}serialNumber": [_line("32TV17")]})

    assert parsed.extracted.serialNumber == "32TV17"
    assert parsed.field_confidences["serialNumber"] == 0.9


def test_field_region_overrides_a_whole_ticket_guess(sample_stations):
    ocr = {
        "whole": [_line("KY VE A1B2C3 GIAI DAC BIET", 0.95)],
        f"{FIELD_REGION_PREFIX}serialNumber": [_line("32TV17", 0.60)],
    }

    parsed = _parser(sample_stations).parse(ocr)

    assert parsed.extracted.serialNumber == "32TV17"


def test_field_region_value_is_still_validated(sample_stations):
    # A garbled read must not be trusted just because it was well-located --
    # the whole-ticket result stands instead.
    ocr = {
        "whole": [_line("32TV17", 0.8)],
        f"{FIELD_REGION_PREFIX}serialNumber": [_line("!!!", 0.99)],
    }

    parsed = _parser(sample_stations).parse(ocr)

    assert parsed.extracted.serialNumber == "32TV17"


def test_field_region_parses_a_date_and_normalises_it(sample_stations):
    parsed = _parser(sample_stations).parse({f"{FIELD_REGION_PREFIX}drawDate": [_line("05/08/2026")]})

    assert parsed.extracted.drawDate == "2026-08-05"


def test_field_region_resolves_the_station_code(sample_stations):
    parsed = _parser(sample_stations).parse({f"{FIELD_REGION_PREFIX}stationName": [_line("can tho")]})

    assert parsed.extracted.stationName == "Cần Thơ"
    assert parsed.extracted.stationCode == "CTH"


def test_field_region_collapses_spaced_out_digits(sample_stations):
    # OCR reads a widely-kerned decorative number with gaps between digits.
    parsed = _parser(sample_stations).parse({f"{FIELD_REGION_PREFIX}numbers": [_line("2 9 8 4 0 7")]})

    assert parsed.extracted.numbers == "298407"


def test_field_region_rejects_a_clipped_number(sample_stations):
    # A field crop that clips a 6-digit number down to "885" is digits-shaped
    # but wrong; the whole-ticket heuristic applies the same length rule, so
    # accepting it here would make this path worse than not having it.
    parsed = _parser(sample_stations).parse({f"{FIELD_REGION_PREFIX}numbers": [_line("885")]})

    assert parsed.extracted.numbers is None


def test_field_region_respects_the_station_expected_number_length(sample_stations):
    ocr = {f"{FIELD_REGION_PREFIX}numbers": [_line("29840")]}

    assert _parser(sample_stations).parse(ocr, expected_number_length=5).extracted.numbers == "29840"
    assert _parser(sample_stations).parse(ocr, expected_number_length=6).extracted.numbers is None


def test_field_region_formats_the_denomination(sample_stations):
    parsed = _parser(sample_stations).parse({f"{FIELD_REGION_PREFIX}ticketType": [_line("10.000d")]})

    assert parsed.extracted.ticketType == "10.000đ"


def test_field_region_clears_the_stale_refinement_position(sample_stations):
    # ROI refinement re-crops using field_positions; a position from the
    # whole-ticket pass no longer describes where this value came from.
    ocr = {
        "whole": [_line("32TV17", 0.8)],
        f"{FIELD_REGION_PREFIX}numbers": [_line("298407", 0.9)],
    }

    parsed = _parser(sample_stations).parse(ocr)

    assert parsed.extracted.numbers == "298407"
    assert "numbers" not in parsed.field_positions
