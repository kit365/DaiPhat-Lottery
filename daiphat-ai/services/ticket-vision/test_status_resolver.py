from domain.enums.ticket_status import TicketStatus
from domain.scanning.status_resolver import resolve_status
from domain.validation.format_validator import ValidationResult

HIGH = 0.85
LOW = 0.70

VALID = ValidationResult(missing_fields=[], errors=[])
FULL_CONFIDENCES = {
    "stationName": 0.95,
    "serialNumber": 0.95,
    "numbers": 0.95,
    "drawDate": 0.95,
}


def test_all_fields_high_confidence_and_valid_is_complete():
    status, confidence = resolve_status(FULL_CONFIDENCES, VALID, HIGH, LOW)

    assert status == TicketStatus.COMPLETE
    assert confidence == 0.95


def test_weakest_field_drives_overall_confidence():
    confidences = {**FULL_CONFIDENCES, "drawDate": 0.72}

    status, confidence = resolve_status(confidences, VALID, HIGH, LOW)

    assert status == TicketStatus.NEEDS_REVIEW
    assert confidence == 0.72


def test_moderate_confidence_is_needs_review():
    confidences = {**FULL_CONFIDENCES, "numbers": 0.75}

    status, confidence = resolve_status(confidences, VALID, HIGH, LOW)

    assert status == TicketStatus.NEEDS_REVIEW


def test_low_confidence_is_incomplete_even_if_valid():
    confidences = {**FULL_CONFIDENCES, "serialNumber": 0.5}

    status, confidence = resolve_status(confidences, VALID, HIGH, LOW)

    assert status == TicketStatus.INCOMPLETE
    assert confidence == 0.5


def test_missing_field_forces_incomplete_regardless_of_confidence():
    invalid = ValidationResult(missing_fields=["numbers"], errors=[])

    status, _confidence = resolve_status(FULL_CONFIDENCES, invalid, HIGH, LOW)

    assert status == TicketStatus.INCOMPLETE


def test_validation_error_forces_incomplete_regardless_of_confidence():
    invalid = ValidationResult(missing_fields=[], errors=["serialNumber không đúng định dạng."])

    status, _confidence = resolve_status(FULL_CONFIDENCES, invalid, HIGH, LOW)

    assert status == TicketStatus.INCOMPLETE


def test_boundary_at_exactly_high_threshold_is_complete():
    confidences = {**FULL_CONFIDENCES, "drawDate": HIGH}

    status, _confidence = resolve_status(confidences, VALID, HIGH, LOW)

    assert status == TicketStatus.COMPLETE


def test_boundary_at_exactly_low_threshold_is_needs_review():
    confidences = {**FULL_CONFIDENCES, "drawDate": LOW}

    status, _confidence = resolve_status(confidences, VALID, HIGH, LOW)

    assert status == TicketStatus.NEEDS_REVIEW
