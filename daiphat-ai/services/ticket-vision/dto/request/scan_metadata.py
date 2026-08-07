from pydantic import BaseModel, Field


class StationMetadata(BaseModel):
    id: int | None = None
    name: str
    code: str | None = None
    aliases: list[str] = Field(default_factory=list)
    # Digits expected in the lottery number for this station's product, if
    # Java knows it (Layer 1 doc rule: "Correct length for the corresponding
    # station"). Left unset, the validator accepts a generic digit-length
    # range instead of a station-exact one.
    expectedNumberLength: int | None = None


class ScanMetadata(BaseModel):
    """Optional multipart field alongside the image (doc section 4, Flow 4:
    "Multipart image + optional metadata").

    Java is the source of truth for stations/products -- it should populate
    `activeStations` on every call to POST /v1/scan. When omitted (e.g.
    manual/local testing of this service in isolation), StationMatcher falls
    back to a small built-in seed list
    (domain/stations/default_aliases.py) instead of failing the request.
    """

    activeStations: list[StationMetadata] = Field(default_factory=list)
    maxTickets: int | None = None
    # Detector strategy override, e.g. "contour" (MVP, default) or a future
    # "yolov8". See domain/detection/factory.py.
    detectorStrategy: str | None = None
