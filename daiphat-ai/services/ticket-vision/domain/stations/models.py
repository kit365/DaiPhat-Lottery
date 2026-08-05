from dataclasses import dataclass, field


@dataclass(frozen=True)
class StationRef:
    """A lottery station as known to this scan request.

    Java is the single source of truth for active stations (doc section 3/7:
    "Python service must never write directly to the database" and remains
    a pure inference layer). Java is expected to pass the current active
    station list in the /v1/scan request's optional metadata; the small
    seed list in default_aliases.py is only a bootstrap fallback for when
    metadata isn't supplied (e.g. manual/local testing of this service).
    """

    id: int | None
    name: str
    code: str | None = None
    aliases: tuple[str, ...] = field(default_factory=tuple)
