import re
from dataclasses import dataclass, field
from datetime import date

from dto.response.scan_response import ExtractedTicketFields

# Mirrors the token patterns in domain/parsing/ticket_parser.py -- kept as
# separate constants (rather than importing the parser's private regexes)
# so this module stays a self-contained, independently testable Layer-1
# format check, per doc section 3.
_SERIAL_PATTERN = re.compile(r"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{4,10}$")
_FALLBACK_NUMBER_LENGTHS = (4, 5, 6)


@dataclass
class ValidationResult:
    missing_fields: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return not self.missing_fields and not self.errors


class FormatValidator:
    """Layer 1 validation (doc section 3): fast format checks for immediate
    mobile feedback -- run entirely on this service, before the image or
    its extracted fields are ever sent to Java. Layer 2 (business rules:
    draw-date-is-today-or-tomorrow, duplicate (productId, serialNumber,
    numbers, drawDate) check, product/station ACTIVE check) deliberately
    lives only in Java, since it requires database access this service must
    never have (doc section 3, "conclusion").

    Station-name validity isn't re-checked here: TicketParser only ever
    populates `extracted.stationName` after StationMatcher confirms a fuzzy
    match above the configured threshold, so a stationName being present at
    all *is* the Layer-1 station check having passed.
    """

    def validate(
        self,
        extracted: ExtractedTicketFields,
        expected_number_length: int | None = None,
    ) -> ValidationResult:
        missing: list[str] = []
        errors: list[str] = []

        if not extracted.stationName:
            missing.append("stationName")

        if not extracted.serialNumber:
            missing.append("serialNumber")
        elif not _SERIAL_PATTERN.match(extracted.serialNumber):
            errors.append("serialNumber không đúng định dạng (chữ và số, 4-10 ký tự).")

        if not extracted.numbers:
            missing.append("numbers")
        elif not extracted.numbers.isdigit():
            errors.append("numbers phải là chữ số.")
        elif expected_number_length is not None:
            if len(extracted.numbers) != expected_number_length:
                errors.append(f"numbers phải có {expected_number_length} chữ số cho đài này.")
        elif len(extracted.numbers) not in _FALLBACK_NUMBER_LENGTHS:
            errors.append("numbers có độ dài không hợp lệ.")

        if not extracted.drawDate:
            missing.append("drawDate")
        else:
            try:
                date.fromisoformat(extracted.drawDate)
            except ValueError:
                errors.append("drawDate không phải ngày hợp lệ (ISO 8601).")

        return ValidationResult(missing_fields=missing, errors=errors)
