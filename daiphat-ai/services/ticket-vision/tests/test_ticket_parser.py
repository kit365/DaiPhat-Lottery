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


def test_real_world_serial_formats_are_recognized(sample_stations):
    # Real Vietnamese lottery serials mix letters and digits throughout
    # (e.g. "32TV17"), not just a single optional leading letter.
    parser = _parser(sample_stations)

    result = parser.parse({"body": [OcrTextResult(text="32TV17", confidence=0.85)]})

    assert result.extracted.serialNumber == "32TV17"


def test_numbers_prefers_a_value_repeated_across_the_ticket(sample_stations):
    # Real tickets print the number more than once (small copy near the
    # header, large copy across the body). A value read twice should win
    # over a different value read only once, even if the one-off token has
    # slightly higher single-read confidence.
    parser = _parser(sample_stations)

    ocr_by_region = {
        "header": [OcrTextResult(text="298407", confidence=0.99)],  # a one-off misread
        "body": [
            OcrTextResult(text="530935", confidence=0.90),
            OcrTextResult(text="530935", confidence=0.93),
        ],
    }

    result = parser.parse(ocr_by_region)

    assert result.extracted.numbers == "530935"


def test_serial_prefers_the_candidate_lower_on_the_ticket(sample_stations):
    # A batch/"ky ve" code conventionally prints near the header; the true
    # serial sits low, next to the QR code / draw date. When both an
    # alnum-shaped header code and a lower-positioned candidate are present,
    # prefer the lower one.
    parser = _parser(sample_stations)

    ocr_by_region = {
        "header": [OcrTextResult(text="35TV21", confidence=0.9, y_center=0.1)],
        "body": [OcrTextResult(text="32TV17", confidence=0.9, y_center=0.9)],
    }

    result = parser.parse(ocr_by_region)

    assert result.extracted.serialNumber == "32TV17"


def test_station_falls_back_to_body_when_header_text_matches_no_station(sample_stations):
    # The header band often just OCRs the decorative banner art ("XO SO
    # KIEN THIET ...") which reads fine as text but fuzzy-matches no known
    # station, while the plain-typeface station name prints again lower on
    # the ticket. A non-empty but non-matching header must not block that
    # fallback (previously it only retried when the header band produced no
    # OCR text at all).
    parser = _parser(sample_stations)

    ocr_by_region = {
        "header": [OcrTextResult(text="mo ta khong ro nghia", confidence=0.9, y_center=0.1)],
        "body": [OcrTextResult(text="CAN THO", confidence=0.85, y_center=0.5)],
    }

    result = parser.parse(ocr_by_region)

    assert result.extracted.stationName == "Cần Thơ"
    assert result.extracted.stationCode == "CTH"


def test_number_recovers_from_whitespace_split_digit_run(sample_stations):
    # OCR can read a widely-kerned/decorative printed number as one line
    # with the digits separated by whitespace instead of one contiguous
    # token; the whole line should still be tried as a candidate.
    parser = _parser(sample_stations)

    result = parser.parse({"body": [OcrTextResult(text="2 9 8 4 0 7", confidence=0.7)]})

    assert result.extracted.numbers == "298407"


def test_date_recovers_when_separator_is_read_as_whitespace(sample_stations):
    # A thin "-"/"/" separator against a busy ticket background is easy for
    # OCR to drop; the day/month/year digits then read back as whitespace-
    # separated instead.
    parser = _parser(sample_stations)

    result = parser.parse({"body": [OcrTextResult(text="28 04 2023", confidence=0.8)]})

    assert result.extracted.drawDate == "2023-04-28"


def test_ticket_denomination_is_extracted_and_distinct_from_prize_amount(sample_stations):
    # "10.000d" is the ticket's own price; "2.000.000.000" is the jackpot
    # prize printed elsewhere on the ticket -- must not be confused for it.
    parser = _parser(sample_stations)

    ocr_by_region = {
        "body": [
            OcrTextResult(text="10.000d", confidence=0.9),
            OcrTextResult(text="Giai dac biet 2.000.000.000", confidence=0.9),
        ]
    }

    result = parser.parse(ocr_by_region)

    assert result.extracted.ticketType == "10.000đ"
