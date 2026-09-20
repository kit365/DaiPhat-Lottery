import re
from dataclasses import dataclass, field
from datetime import date

from dto.response.scan_response import ExtractedTicketFields

# Serial: primarily digits, exactly one letter at the start OR end (e.g. A123456, 123456B).
# Letters in the middle (X5CM0897, 32TV17, 4E2) are rejected — those belong to batchCode.
SERIAL_PATTERN = re.compile(r"^(?:[A-Za-z]\d{4,19}|\d{4,19}[A-Za-z])$")
_SERIAL_PATTERN = SERIAL_PATTERN  # backwards-compatible alias

# Lottery number on traditional tickets: exactly 6 digits — never pad/truncate.
_NUMBERS_PATTERN = re.compile(r"^\d{6}$")

# Production batch / ký hiệu: mix of letters and digits (hyphen allowed), not serial-shaped.
BATCH_CODE_PATTERN = re.compile(r"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9\-]{2,24}$")
_BATCH_CODE_PATTERN = BATCH_CODE_PATTERN

_PRICE_DIGITS_PATTERN = re.compile(r"\d+")


@dataclass
class ValidationResult:
    missing_fields: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return not self.missing_fields and not self.errors


def format_vnd_display(amount: int) -> str:
    """Human-readable VND with thousand separators (10.000 VND)."""
    grouped = f"{amount:,}".replace(",", ".")
    return f"{grouped} VND"


def parse_price_digits(raw: str | None) -> int | None:
    if not raw or not str(raw).strip():
        return None
    digits = "".join(_PRICE_DIGITS_PATTERN.findall(str(raw)))
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:
        return None


def is_valid_serial_number(value: str | None) -> bool:
    if not value or not str(value).strip():
        return False
    return bool(SERIAL_PATTERN.match(str(value).strip()))


def is_valid_batch_code(value: str | None) -> bool:
    """True when value is a production lot code and NOT a valid serial shape."""
    if not value or not str(value).strip():
        return False
    cleaned = str(value).strip()
    if is_valid_serial_number(cleaned):
        return False
    return bool(BATCH_CODE_PATTERN.match(cleaned))


def reconcile_serial_and_batch_code(
    serial_number: str | None,
    batch_code: str | None,
) -> tuple[str | None, str | None]:
    """Keep serialNumber / batchCode from swapping into each other.

    - serialNumber must be digits with exactly one letter at start or end.
    - batchCode is the issuer lot/ký hiệu (letters+digits, letter may be mid-string).
    Values that look like batch codes but were placed in serialNumber are moved.
    """
    serial = (serial_number or "").strip() or None
    batch = (batch_code or "").strip() or None

    serial_ok = is_valid_serial_number(serial)
    batch_ok = is_valid_batch_code(batch) or (
        bool(batch) and bool(BATCH_CODE_PATTERN.match(batch)) and not is_valid_serial_number(batch)
    )

    # Misplaced batch code in serialNumber (e.g. XSCMG997, 4E2, 26-T05K4).
    if serial and not serial_ok and is_valid_batch_code(serial):
        if not batch_ok:
            batch = serial
        serial = None
        serial_ok = False
        batch_ok = True

    # Misplaced serial in batchCode when serialNumber is empty/invalid.
    if batch and is_valid_serial_number(batch) and not serial_ok:
        serial = batch
        batch = None
        serial_ok = True

    # Drop batch-shaped serial leftovers that aren't a valid batch either
    # (leave as-is so FormatValidator can surface the format error).
    return serial, batch


class FormatValidator:
    """Layer 1 validation (doc section 3): fast format checks for immediate
    feedback — run entirely on this service before Java Layer-2 business rules.

    Station-name presence: TicketParser only populates stationName after a
    fuzzy match, so presence means Layer-1 station recognition succeeded.
    Schedule / import-line matching stays in Java and Admin confirm.
    """

    def validate(
        self,
        extracted: ExtractedTicketFields,
        expected_number_length: int | None = None,
        expected_price_vnd: int | None = None,
    ) -> ValidationResult:
        missing: list[str] = []
        errors: list[str] = []

        # Normalize swapped fields before format checks.
        serial, batch = reconcile_serial_and_batch_code(
            extracted.serialNumber, extracted.batchCode
        )
        extracted.serialNumber = serial
        extracted.batchCode = batch

        if not extracted.stationName:
            missing.append("stationName")

        if not extracted.serialNumber:
            missing.append("serialNumber")
        elif not SERIAL_PATTERN.match(extracted.serialNumber):
            errors.append(
                "serialNumber không đúng định dạng: chủ yếu là chữ số, đúng 1 chữ cái "
                "ở đầu hoặc cuối (ví dụ A123456, 123456B). Không chấp nhận chữ cái ở giữa."
            )

        if not extracted.numbers:
            missing.append("numbers")
        elif not extracted.numbers.isdigit():
            errors.append("numbers phải là chữ số.")
        elif not _NUMBERS_PATTERN.match(extracted.numbers):
            errors.append(
                "numbers phải đủ đúng 6 chữ số (không được thiếu/thừa; không tự cắt hoặc thêm số)."
            )
        elif expected_number_length is not None and len(extracted.numbers) != expected_number_length:
            # Station-specific length when Java/metadata supplies one (still no pad/truncate).
            errors.append(f"numbers phải có {expected_number_length} chữ số cho đài này.")

        if not extracted.drawDate:
            missing.append("drawDate")
        else:
            try:
                date.fromisoformat(extracted.drawDate)
            except ValueError:
                missing.append("drawDate")
                errors.append("drawDate không phải ngày hợp lệ (ISO 8601).")
                extracted.drawDate = None

        if extracted.batchCode and str(extracted.batchCode).strip():
            code = str(extracted.batchCode).strip()
            if is_valid_serial_number(code) or not BATCH_CODE_PATTERN.match(code):
                errors.append(
                    "batchCode (ký hiệu/lô phát hành) phải gồm cả chữ và số "
                    "(ví dụ 08D, 8K4, 4E2) — không nhầm với số sê-ri hay mã phiếu nhập lô."
                )

        if extracted.ticketType and str(extracted.ticketType).strip():
            parsed = parse_price_digits(extracted.ticketType)
            if parsed is None:
                errors.append(
                    "ticketType (mệnh giá) không đọc được thành số tiền hợp lệ."
                )
            else:
                # Normalize display for downstream / Admin.
                extracted.ticketType = format_vnd_display(parsed)
                if expected_price_vnd is not None and parsed != expected_price_vnd:
                    errors.append(
                        f"ticketType ({format_vnd_display(parsed)}) không khớp mệnh giá nhà đài "
                        f"({format_vnd_display(expected_price_vnd)})."
                    )

        return ValidationResult(missing_fields=missing, errors=errors)
