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
        self.last_extra_images: list[tuple[str, bytes]] | None = None

    def analyze_ticket_image(
        self,
        image_bytes: bytes,
        prompt: str,
        *,
        extra_images: list[tuple[str, bytes]] | None = None,
    ) -> ScanExtractionResult:
        self.last_prompt = prompt
        self.last_extra_images = extra_images
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


def test_per_ticket_ocr_uses_single_collage_call(monkeypatch):
    """Five YOLO tickets should need 1 Groq call (collage), not N calls."""
    from domain.scanning import llm_ticket_scan_service as llm_mod
    from domain.scanning.yolo_llm_guidance import YoloLlmGuidance

    calls: list[dict] = []

    class CountingVision:
        def analyze_ticket_image(
            self,
            image_bytes: bytes,
            prompt: str,
            *,
            extra_images: list[tuple[str, bytes]] | None = None,
        ) -> ScanExtractionResult:
            calls.append(
                {
                    "bytes": len(image_bytes),
                    "extras": len(extra_images or []),
                    "prompt": prompt,
                }
            )
            return ScanExtractionResult(
                tickets=[
                    TicketExtraction(
                        numbers=f"{i:06d}",
                        serialNumber=f"A{i:06d}",
                        stationName="TP. Hồ Chí Minh",
                        stationCode="HCM",
                        drawDate="2026-08-05",
                        fieldConfidences={
                            "numbers": 0.9,
                            "serialNumber": 0.9,
                            "stationName": 0.9,
                            "drawDate": 0.9,
                        },
                    )
                    for i in range(5)
                ]
            )

    guidance = YoloLlmGuidance(
        ticket_count=5,
        ticket_boxes=[
            (10, 10, 80, 120),
            (100, 10, 80, 120),
            (10, 160, 80, 120),
            (100, 160, 80, 120),
            (50, 300, 80, 120),
        ],
        ticket_confidences=[0.9] * 5,
        ticket_field_boxes=[{}] * 5,
    )
    monkeypatch.setattr(llm_mod, "build_yolo_llm_guidance", lambda *a, **k: guidance)

    service = GroqTicketScanService(
        groq_client=CountingVision(),
        include_cropped_image=False,
    )
    result = service.scan_image(
        _minimal_jpeg_bytes(width=240, height=460),
        ScanMetadata(
            activeStations=[
                StationMetadata(name="TP. Hồ Chí Minh", code="HCM", expectedNumberLength=6)
            ],
            maxTickets=5,
        ),
    )

    assert len(calls) == 1
    assert calls[0]["extras"] == 0
    assert "COLLAGE MODE" in calls[0]["prompt"]
    assert result.ticketCount == 5


def test_resolve_recognition_engine_prefers_metadata():
    assert resolve_recognition_engine(ScanMetadata(recognitionEngine="legacy"), "groq") == "legacy"
    assert resolve_recognition_engine(ScanMetadata(recognitionEngine="grok"), "groq") == "grok"
    assert resolve_recognition_engine(ScanMetadata(recognitionEngine="gemini"), "groq") == "gemini"
    assert resolve_recognition_engine(ScanMetadata(recognitionEngine="groq"), "gemini") == "groq"
    assert resolve_recognition_engine(ScanMetadata(), "groq") == "groq"
    assert resolve_recognition_engine(ScanMetadata(), "unknown") == "groq"
