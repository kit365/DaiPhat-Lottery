import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from domain.enums.ticket_status import TicketStatus
from domain.scanning.gemini_ticket_scan_service import GeminiTicketScanService
from domain.scanning.grok_ticket_scan_service import GrokTicketScanService
from domain.scanning.groq_ticket_scan_service import GroqTicketScanService
from domain.scanning.llm_ticket_scan_service import resolve_recognition_engine
from dto.request.scan_metadata import ScanMetadata, StationMetadata
from infra.vision_extraction import ScanExtractionResult, TicketExtraction


def _minimal_jpeg_bytes(width: int = 120, height: int = 80) -> bytes:
    image = np.zeros((height, width, 3), dtype=np.uint8)
    ok, buffer = cv2.imencode(".jpg", image)
    assert ok
    return buffer.tobytes()


class FakeVisionClient:
    def __init__(self, result: ScanExtractionResult) -> None:
        self._result = result
        self.last_prompt: str | None = None

    def analyze_ticket_image(self, image_bytes: bytes, prompt: str) -> ScanExtractionResult:
        self.last_prompt = prompt
        return self._result


def test_gemini_scan_maps_complete_ticket():
    fake = FakeVisionClient(
        ScanExtractionResult(
            tickets=[
                TicketExtraction(
                    stationName="TP. Hồ Chí Minh",
                    stationCode="HCM",
                    serialNumber="A012345",
                    numbers="123456",
                    drawDate="2026-08-05",
                    fieldConfidences={
                        "stationName": 0.92,
                        "serialNumber": 0.9,
                        "numbers": 0.91,
                        "drawDate": 0.89,
                    },
                )
            ]
        )
    )
    service = GeminiTicketScanService(
        gemini_client=fake,
        include_cropped_image=False,
    )
    metadata = ScanMetadata(
        activeStations=[
            StationMetadata(
                name="TP. Hồ Chí Minh",
                code="HCM",
                aliases=["Sài Gòn"],
                expectedNumberLength=6,
            )
        ]
    )

    result = service.scan_image(_minimal_jpeg_bytes(), metadata)

    assert result.ticketCount == 1
    ticket = result.tickets[0]
    assert ticket.status == TicketStatus.COMPLETE
    assert ticket.extracted.numbers == "123456"
    assert ticket.extracted.serialNumber == "A012345"
    assert ticket.missingFields == []


def test_gemini_scan_marks_missing_fields_incomplete():
    fake = FakeVisionClient(
        ScanExtractionResult(
            tickets=[
                TicketExtraction(
                    stationName="Cần Thơ",
                    numbers="1234",
                    fieldConfidences={
                        "stationName": 0.8,
                        "numbers": 0.75,
                        "serialNumber": 0.0,
                        "drawDate": 0.0,
                    },
                )
            ]
        )
    )
    service = GeminiTicketScanService(gemini_client=fake, include_cropped_image=False)
    metadata = ScanMetadata(activeStations=[StationMetadata(name="Cần Thơ", code="CTH")])

    result = service.scan_image(_minimal_jpeg_bytes(), metadata)

    ticket = result.tickets[0]
    assert ticket.status in (TicketStatus.INCOMPLETE, TicketStatus.NEEDS_REVIEW)
    assert "serialNumber" in ticket.missingFields
    assert "drawDate" in ticket.missingFields


def test_grok_scan_still_works_via_wrapper():
    fake = FakeVisionClient(
        ScanExtractionResult(
            tickets=[
                TicketExtraction(
                    stationName="TP. Hồ Chí Minh",
                    stationCode="HCM",
                    serialNumber="A012345",
                    numbers="123456",
                    drawDate="2026-08-05",
                    fieldConfidences={
                        "stationName": 0.92,
                        "serialNumber": 0.9,
                        "numbers": 0.91,
                        "drawDate": 0.89,
                    },
                )
            ]
        )
    )
    service = GrokTicketScanService(grok_client=fake, include_cropped_image=False)
    result = service.scan_image(
        _minimal_jpeg_bytes(),
        ScanMetadata(
            activeStations=[
                StationMetadata(name="TP. Hồ Chí Minh", code="HCM", expectedNumberLength=6)
            ]
        ),
    )
    assert result.ticketCount == 1
    assert result.tickets[0].status == TicketStatus.COMPLETE


def test_groq_scan_maps_complete_ticket():
    fake = FakeVisionClient(
        ScanExtractionResult(
            tickets=[
                TicketExtraction(
                    stationName="TP. Hồ Chí Minh",
                    stationCode="HCM",
                    serialNumber="A012345",
                    numbers="123456",
                    drawDate="2026-08-05",
                    fieldConfidences={
                        "stationName": 0.92,
                        "serialNumber": 0.9,
                        "numbers": 0.91,
                        "drawDate": 0.89,
                    },
                )
            ]
        )
    )
    service = GroqTicketScanService(groq_client=fake, include_cropped_image=False)
    result = service.scan_image(
        _minimal_jpeg_bytes(),
        ScanMetadata(
            activeStations=[
                StationMetadata(name="TP. Hồ Chí Minh", code="HCM", expectedNumberLength=6)
            ]
        ),
    )
    assert result.ticketCount == 1
    assert result.tickets[0].status == TicketStatus.COMPLETE


def test_resolve_recognition_engine_prefers_metadata():
    assert resolve_recognition_engine(ScanMetadata(recognitionEngine="legacy"), "groq") == "legacy"
    assert resolve_recognition_engine(ScanMetadata(recognitionEngine="grok"), "groq") == "grok"
    assert resolve_recognition_engine(ScanMetadata(recognitionEngine="gemini"), "groq") == "gemini"
    assert resolve_recognition_engine(ScanMetadata(recognitionEngine="groq"), "gemini") == "groq"
    assert resolve_recognition_engine(ScanMetadata(), "groq") == "groq"
    assert resolve_recognition_engine(ScanMetadata(), "unknown") == "groq"
