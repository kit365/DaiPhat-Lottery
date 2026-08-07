from enum import Enum


class TicketStatus(str, Enum):
    """Overlay color / completeness state for one detected ticket.

    Mapping to the mobile bounding-box colors (see docs/ticket-scanning.md):
      COMPLETE      -> green  -> all required fields present, validation passed,
                                 confidence >= HIGH threshold
      NEEDS_REVIEW  -> yellow -> all required fields present but confidence is
                                 between LOW and HIGH threshold
      INCOMPLETE    -> red    -> missing required field(s), a Layer-1 validation
                                 error, or confidence below LOW threshold
    """

    COMPLETE = "COMPLETE"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    INCOMPLETE = "INCOMPLETE"


# Fields every ticket must have to be considered "complete". Order matters for
# nothing functional, but keeping it stable makes `missingFields` deterministic.
REQUIRED_FIELDS: tuple[str, ...] = ("stationName", "serialNumber", "numbers", "drawDate")
