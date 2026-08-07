from domain.ocr.base import OcrTextResult
from domain.parsing.ticket_parser import TicketParser
from domain.stations.matcher import StationMatcher


def _parser(sample_stations) -> TicketParser:
    return TicketParser(StationMatcher(sample_stations), station_fuzzy_threshold=80)


def test_parses_a_complete_ticket(sample_stations):
    parser = _parser(sample_stations)

    ocr_by_region = {
        "header": [OcrTextResult(text="XSKT TP.HCM", confidence=0.92)],
        "body": [
            OcrTextResult(text="A012345", confidence=0.88),
            OcrTextResult(text="123456", confidence=0.95),
            OcrTextResult(text="Ngay quay: 05/08/2026", confidence=0.9),
        ],
    }

    result = parser.parse(ocr_by_region)

    assert result.extracted.stationName == "TP. Hồ Chí Minh"
    assert result.extracted.stationCode == "HCM"
    assert result.extracted.serialNumber == "A012345"
    assert result.extracted.numbers == "123456"
    assert result.extracted.drawDate == "2026-08-05"

    assert result.field_confidences["stationName"] > 0.7
    assert result.field_confidences["serialNumber"] == 0.88
    assert result.field_confidences["numbers"] == 0.95
    assert result.field_confidences["drawDate"] == 0.9


def test_missing_fields_are_left_none_with_zero_confidence(sample_stations):
    parser = _parser(sample_stations)

    ocr_by_region = {
        "header": [OcrTextResult(text="mo ta khong ro nghia", confidence=0.4)],
        "body": [],
    }

    result = parser.parse(ocr_by_region)

    assert result.extracted.stationName is None
    assert result.extracted.serialNumber is None
    assert result.extracted.numbers is None
    assert result.extracted.drawDate is None
    assert all(confidence == 0.0 for confidence in result.field_confidences.values())


def test_iso_date_is_recognized_directly(sample_stations):
    parser = _parser(sample_stations)

    result = parser.parse({"body": [OcrTextResult(text="2026-08-05", confidence=0.8)]})

    assert result.extracted.drawDate == "2026-08-05"
    assert result.field_confidences["drawDate"] == 0.8


def test_numbers_respect_expected_length_when_provided(sample_stations):
    parser = _parser(sample_stations)

    # A 6-digit and a 4-digit run both appear; only the 4-digit one should
    # be picked when the station expects exactly 4 digits.
    ocr_by_region = {"body": [OcrTextResult(text="654321 4321", confidence=0.9)]}

    result = parser.parse(ocr_by_region, expected_number_length=4)

    assert result.extracted.numbers == "4321"


def test_invalid_calendar_date_is_ignored(sample_stations):
    parser = _parser(sample_stations)

    # 32/13/2026 isn't a real date -- should not be accepted as drawDate.
    result = parser.parse({"body": [OcrTextResult(text="32/13/2026", confidence=0.9)]})

    assert result.extracted.drawDate is None
