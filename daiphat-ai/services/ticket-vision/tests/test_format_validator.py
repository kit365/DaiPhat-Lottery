from domain.validation.format_validator import FormatValidator
from dto.response.scan_response import ExtractedTicketFields


def test_fully_valid_ticket_has_no_missing_fields_or_errors():
    validator = FormatValidator()
    extracted = ExtractedTicketFields(
        stationName="TP. Hồ Chí Minh",
        stationCode="HCM",
        serialNumber="A012345",
        numbers="123456",
        drawDate="2026-08-05",
    )

    result = validator.validate(extracted)

    assert result.is_valid
    assert result.missing_fields == []
    assert result.errors == []


def test_all_fields_missing():
    validator = FormatValidator()

    result = validator.validate(ExtractedTicketFields())

    assert not result.is_valid
    assert set(result.missing_fields) == {"stationName", "serialNumber", "numbers", "drawDate"}
    assert result.errors == []


def test_invalid_serial_format_is_an_error_not_a_missing_field():
    validator = FormatValidator()
    extracted = ExtractedTicketFields(
        stationName="Cần Thơ",
        serialNumber="AB1234567890",  # too many letters and digits
        numbers="123456",
        drawDate="2026-08-05",
    )

    result = validator.validate(extracted)

    assert not result.is_valid
    assert "serialNumber" not in result.missing_fields
    assert any("serialNumber" in error for error in result.errors)


def test_numbers_must_match_expected_station_length():
    validator = FormatValidator()
    extracted = ExtractedTicketFields(
        stationName="Cần Thơ",
        serialNumber="A012345",
        numbers="123456",
        drawDate="2026-08-05",
    )

    result = validator.validate(extracted, expected_number_length=4)

    assert not result.is_valid
    assert any("numbers" in error for error in result.errors)


def test_non_iso_draw_date_is_an_error():
    validator = FormatValidator()
    extracted = ExtractedTicketFields(
        stationName="Cần Thơ",
        serialNumber="A012345",
        numbers="123456",
        drawDate="05/08/2026",  # not ISO -- parser should have converted this already
    )

    result = validator.validate(extracted)

    assert not result.is_valid
    assert any("drawDate" in error for error in result.errors)
