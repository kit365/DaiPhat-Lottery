from pydantic import BaseModel, Field

from domain.enums.ticket_status import TicketStatus


class BoundingBox(BaseModel):
    """Axis-aligned box (x, y, width, height) for a simple mobile overlay,
    plus the 4 ordered corner points (top-left, top-right, bottom-right,
    bottom-left) of the ticket's actual outline for a perspective-accurate
    overlay (doc section 10: "mixed-reality-like experience"). Both are in
    the *resized* image's coordinate space -- see
    domain/preprocessing/pipeline.py:resize_if_needed.
    """

    x: int
    y: int
    width: int
    height: int
    corners: list[list[int]] = Field(default_factory=list)


class ExtractedTicketFields(BaseModel):
    stationName: str | None = None
    stationCode: str | None = None
    serialNumber: str | None = None
    numbers: str | None = None
    drawDate: str | None = None


class TicketScanResult(BaseModel):
    ticketIndex: int
    bbox: BoundingBox
    status: TicketStatus
    confidence: float
    extracted: ExtractedTicketFields
    fieldConfidences: dict[str, float] = Field(default_factory=dict)
    missingFields: list[str] = Field(default_factory=list)
    validationErrors: list[str] = Field(default_factory=list)
    croppedImageBase64: str | None = None


class ScanResponse(BaseModel):
    scanId: str
    ticketCount: int
    tickets: list[TicketScanResult]
    warnings: list[str] = Field(default_factory=list)
