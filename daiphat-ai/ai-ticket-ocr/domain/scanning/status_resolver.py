from domain.enums.ticket_status import REQUIRED_FIELDS, TicketStatus
from domain.validation.format_validator import ValidationResult


def resolve_status(
    field_confidences: dict[str, float],
    validation: ValidationResult,
    high_threshold: float,
    low_threshold: float,
) -> tuple[TicketStatus, float]:
    """doc section 4, "Status colors":
      Green  (COMPLETE)     -- all required fields detected, validation
                               passed, confidence >= high_threshold
      Yellow (NEEDS_REVIEW) -- all fields detected, confidence between
                               low_threshold and high_threshold
      Red    (INCOMPLETE)   -- missing field(s), a validation error, or
                               confidence below low_threshold

    Overall confidence is the *minimum* confidence across the required
    fields (the weakest link), not an average: one garbled field shouldn't
    be masked by three confidently-read ones when deciding whether a human
    should double check the ticket.
    """
    overall = min((field_confidences.get(name, 0.0) for name in REQUIRED_FIELDS), default=0.0)

    if not validation.is_valid:
        return TicketStatus.INCOMPLETE, overall

    if overall >= high_threshold:
        return TicketStatus.COMPLETE, overall
    if overall >= low_threshold:
        return TicketStatus.NEEDS_REVIEW, overall
    return TicketStatus.INCOMPLETE, overall
