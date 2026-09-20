from domain.validation.format_validator import FormatValidator, format_vnd_display
from dto.response.scan_response import ExtractedTicketFields


def test_fully_valid_ticket_has_no_missing_fields_or_errors():
    validator = FormatValidator()
    extracted = ExtractedTicketFields(
        stationName="TP. Hồ Chí Minh",
        stationCode="HCM",
        serialNumber="A012345",
        numbers="123456",
        drawDate="2026-08-05",
        ticketType="10000",
        batchCode="08D",
    )

    result = validator.validate(extracted)

    assert result.is_valid
    assert result.missing_fields == []
    assert result.errors == []
    assert extracted.ticketType == "10.000 VND"


def test_all_fields_missing():
    validator = FormatValidator()

    result = validator.validate(ExtractedTicketFields())

    assert not result.is_valid
    assert set(result.missing_fields) == {"stationName", "serialNumber", "numbers", "drawDate"}
    assert result.errors == []


def test_serial_letter_at_start_or_end_is_accepted():
    validator = FormatValidator()
    for serial in ("A123456", "123456B"):
        extracted = ExtractedTicketFields(
            stationName="Cần Thơ",
            serialNumber=serial,
            numbers="123456",
            drawDate="2026-08-05",
        )
        assert validator.validate(extracted).is_valid, serial


def test_serial_with_letter_in_middle_is_rejected():
    validator = FormatValidator()
    for serial in ("X5CM0897", "32TV17", "AB123456", "4E2", "XSCMG997"):
        extracted = ExtractedTicketFields(
            stationName="Cần Thơ",
            serialNumber=serial,
            numbers="123456",
            drawDate="2026-08-05",
        )
        result = validator.validate(extracted)
        assert not result.is_valid, serial
        # Batch-shaped values are moved out of serialNumber into batchCode.
        assert extracted.serialNumber is None, serial
        assert extracted.batchCode == serial, serial
        assert "serialNumber" in result.missing_fields


def test_reconcile_moves_batch_code_out_of_serial_number():
    from domain.validation.format_validator import reconcile_serial_and_batch_code

    serial, batch = reconcile_serial_and_batch_code("XSCMG997", None)
    assert serial is None
    assert batch == "XSCMG997"

    serial, batch = reconcile_serial_and_batch_code("4E2", "")
    assert serial is None
    assert batch == "4E2"

    serial, batch = reconcile_serial_and_batch_code("A424944", "08D")
    assert serial == "A424944"
    assert batch == "08D"

    serial, batch = reconcile_serial_and_batch_code(None, "A123456")
    assert serial == "A123456"
    assert batch is None

    serial, batch = reconcile_serial_and_batch_code("26-T05K4", None)
    assert serial is None
    assert batch == "26-T05K4"


def test_numbers_must_be_exactly_six_digits():
    validator = FormatValidator()
    extracted = ExtractedTicketFields(
        stationName="Cần Thơ",
        serialNumber="A012345",
        numbers="4249",
        drawDate="2026-08-05",
    )

    result = validator.validate(extracted)

    assert not result.is_valid
    assert any("6 chữ số" in error for error in result.errors)


def test_numbers_seven_digits_rejected_without_truncation():
    validator = FormatValidator()
    extracted = ExtractedTicketFields(
        stationName="Cần Thơ",
        serialNumber="A012345",
        numbers="1234567",
        drawDate="2026-08-05",
    )

    result = validator.validate(extracted)

    assert not result.is_valid
    assert extracted.numbers == "1234567"


def test_batch_code_requires_letters_and_digits():
    validator = FormatValidator()
    extracted = ExtractedTicketFields(
        stationName="Cần Thơ",
        serialNumber="A012345",
        numbers="123456",
        drawDate="2026-08-05",
        batchCode="ABCDEF",
    )
    result = validator.validate(extracted)
    assert not result.is_valid
    assert any("batchCode" in error for error in result.errors)

    extracted.batchCode = "08D"
    assert validator.validate(extracted).is_valid


def test_price_mismatch_against_expected_station_price():
    validator = FormatValidator()
    extracted = ExtractedTicketFields(
        stationName="Cần Thơ",
        serialNumber="A012345",
        numbers="123456",
        drawDate="2026-08-05",
        ticketType="20.000đ",
    )

    result = validator.validate(extracted, expected_price_vnd=10_000)

    assert not result.is_valid
    assert any("ticketType" in error for error in result.errors)
    assert extracted.ticketType == "20.000 VND"


def test_format_vnd_display():
    assert format_vnd_display(10_000) == "10.000 VND"
    assert format_vnd_display(20_000) == "20.000 VND"


def test_non_iso_draw_date_is_an_error():
    validator = FormatValidator()
    extracted = ExtractedTicketFields(
        stationName="Cần Thơ",
        serialNumber="A012345",
        numbers="123456",
        drawDate="05/08/2026",
    )

    result = validator.validate(extracted)

    assert not result.is_valid
    assert "drawDate" in result.missing_fields
    assert any("drawDate" in error for error in result.errors)
    assert extracted.drawDate is None
