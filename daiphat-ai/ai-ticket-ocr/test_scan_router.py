import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app
from domain.enums.ticket_status import TicketStatus
from dto.response.scan_response import (
    BoundingBox,
    ExtractedTicketFields,
    ScanResponse,
    TicketScanResult,
)
from infra import llm_quota
from routers.scan import (
    get_gemini_ticket_scan_service,
    get_grok_ticket_scan_service,
    get_groq_ticket_scan_service,
    get_legacy_ticket_scan_service,
)


@pytest.fixture(autouse=True)
def _isolate_llm_quota(tmp_path: Path, monkeypatch):
    """Avoid sharing the process-wide daily quota file across tests."""
    from infra import llm_circuit

    monkeypatch.setattr(llm_quota.settings, "TICKET_VISION_LLM_DAILY_QUOTA", 0)
    # Match production default: Legacy-first; tests that need Groq-first set False.
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", False)
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LLM_FALLBACK_TO_LEGACY", True)
    llm_quota.set_quota_dir_for_tests(tmp_path / "quota")
    llm_circuit.reset_for_tests()
    yield
    llm_quota.set_quota_dir_for_tests(None)
    llm_circuit.reset_for_tests()


class FakeLegacyScanService:
    def __init__(self, response: ScanResponse | None = None) -> None:
        self.called = False
        self._response = response or _sample_response()

    def scan_image(self, image_bytes, metadata):
        self.called = True
        return self._response


class FakeLlmScanService:
    def __init__(self, response: ScanResponse | None = None) -> None:
        self.called = False
        self.received_metadata = None
        self._response = response or _sample_response()

    def scan_image(self, image_bytes, metadata):
        self.called = True
        self.received_metadata = metadata
        return self._response


def _sample_response(*, confidence: float = 0.9, status: TicketStatus = TicketStatus.COMPLETE) -> ScanResponse:
    return ScanResponse(
        scanId="test-scan-id",
        ticketCount=1,
        tickets=[
            TicketScanResult(
                ticketIndex=0,
                bbox=BoundingBox(
                    x=0,
                    y=0,
                    width=100,
                    height=200,
                    corners=[[0, 0], [100, 0], [100, 200], [0, 200]],
                ),
                status=status,
                confidence=confidence,
                extracted=ExtractedTicketFields(
                    stationName="TP. Hồ Chí Minh",
                    stationCode="HCM",
                    serialNumber="A012345",
                    numbers="123456",
                    drawDate="2026-08-05",
                ),
                fieldConfidences={
                    "stationName": confidence,
                    "serialNumber": confidence,
                    "numbers": confidence,
                    "drawDate": confidence,
                },
                missingFields=[] if status == TicketStatus.COMPLETE else ["drawDate"],
                validationErrors=[],
                croppedImageBase64=None,
            )
        ],
        warnings=[],
    )


def _weak_legacy_response() -> ScanResponse:
    return _sample_response(confidence=0.4, status=TicketStatus.INCOMPLETE)


def _override_all(fake_groq, fake_gemini, fake_grok, fake_legacy):
    app.dependency_overrides[get_groq_ticket_scan_service] = lambda: fake_groq
    app.dependency_overrides[get_gemini_ticket_scan_service] = lambda: fake_gemini
    app.dependency_overrides[get_grok_ticket_scan_service] = lambda: fake_grok
    app.dependency_overrides[get_legacy_ticket_scan_service] = lambda: fake_legacy


def test_scan_default_calls_groq_first(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", False)
    fake_groq = FakeLlmScanService()
    fake_gemini = FakeLlmScanService()
    fake_grok = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService()
    _override_all(fake_groq, fake_gemini, fake_grok, fake_legacy)
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert fake_groq.called is True
    assert fake_legacy.called is False
    assert response.json()["data"]["recognitionEngineUsed"] == "groq"


def test_scan_legacy_first_skips_groq_when_legacy_confident(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", True)
    fake_groq = FakeLlmScanService()
    fake_gemini = FakeLlmScanService()
    fake_grok = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService()
    _override_all(fake_groq, fake_gemini, fake_grok, fake_legacy)
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert fake_legacy.called is True
    assert fake_groq.called is False
    assert response.json()["data"]["recognitionEngineUsed"] == "legacy"


def test_scan_legacy_first_boosts_with_groq_when_legacy_confidence_low(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", True)
    monkeypatch.setattr("routers.scan.settings.GROQ_API_KEY", "test-key")
    fake_groq = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService(_weak_legacy_response())
    _override_all(fake_groq, FakeLlmScanService(), FakeLlmScanService(), fake_legacy)
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert fake_legacy.called is True
    assert fake_groq.called is True
    assert response.json()["data"]["recognitionEngineUsed"] == "groq"


def test_merge_boost_keeps_legacy_numbers_when_llm_collage_mixes_tickets():
    from routers.scan import _merge_boost_with_legacy

    legacy = ScanResponse(
        scanId="legacy",
        ticketCount=1,
        tickets=[
            TicketScanResult(
                ticketIndex=0,
                bbox=BoundingBox(x=10, y=10, width=200, height=400, corners=[]),
                status=TicketStatus.INCOMPLETE,
                confidence=0.4,
                extracted=ExtractedTicketFields(
                    stationName="TP. Hồ Chí Minh",
                    stationCode="HCM",
                    numbers="676789",
                    drawDate="2026-04-27",
                    serialNumber=None,
                    batchCode="4E2",
                ),
                fieldConfidences={"numbers": 0.9, "stationName": 0.85},
                missingFields=["serialNumber"],
            )
        ],
    )
    llm = ScanResponse(
        scanId="llm",
        ticketCount=1,
        tickets=[
            TicketScanResult(
                ticketIndex=0,
                bbox=BoundingBox(x=12, y=12, width=200, height=400, corners=[]),
                status=TicketStatus.COMPLETE,
                confidence=0.9,
                extracted=ExtractedTicketFields(
                    stationName="Tây Ninh",
                    stationCode="TNH",
                    numbers="626621",
                    drawDate="2026-09-24",
                    serialNumber="A111111",
                    batchCode="8MA",
                ),
                fieldConfidences={"numbers": 0.99},
            )
        ],
    )
    merged = _merge_boost_with_legacy(legacy, llm)
    ticket = merged.tickets[0]
    assert ticket.extracted.numbers == "676789"
    assert ticket.extracted.stationCode == "HCM"
    assert ticket.extracted.drawDate == "2026-04-27"
    assert ticket.extracted.serialNumber == "A111111"  # filled from LLM gap
    assert ticket.extracted.batchCode == "4E2"


def test_scan_legacy_first_skips_groq_boost_when_api_key_missing(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", True)
    monkeypatch.setattr("routers.scan.settings.GROQ_API_KEY", "")
    fake_groq = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService(_weak_legacy_response())
    _override_all(fake_groq, FakeLlmScanService(), FakeLlmScanService(), fake_legacy)
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert fake_legacy.called is True
    assert fake_groq.called is False
    body = response.json()["data"]
    assert body["recognitionEngineUsed"] == "legacy"
    assert any("GROQ_API_KEY" in str(w) for w in (body.get("warnings") or []))


def test_scan_legacy_first_keeps_legacy_when_groq_hits_rate_limit(monkeypatch):
    """ITPM/token exhaustion during boost must return Legacy immediately."""
    from infra.vision_extraction import VisionApiError

    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", True)
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_GROQ_BOOST_FAIL_FAST", True)
    monkeypatch.setattr("routers.scan.settings.GROQ_API_KEY", "test-key")

    class RateLimitedGroq:
        def __init__(self) -> None:
            self.called = False

        def scan_image(self, image_bytes, metadata):
            self.called = True
            raise VisionApiError("Groq API rate limit exceeded (HTTP 429)", status_code=429)

    fake_groq = RateLimitedGroq()
    fake_legacy = FakeLegacyScanService(_weak_legacy_response())
    _override_all(fake_groq, FakeLlmScanService(), FakeLlmScanService(), fake_legacy)
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert fake_legacy.called is True
    assert fake_groq.called is True
    assert body["data"]["recognitionEngineUsed"] == "legacy"
    assert body["data"]["tickets"]
    assert any("OCR local" in w or "giới hạn" in w.lower() or "rate" in w.lower()
               or "quá tải" in w.lower() or "hạn mức" in w.lower()
               for w in (body["data"].get("warnings") or [""]))


def test_scan_legacy_engine_routes_to_legacy_service(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    fake_groq = FakeLlmScanService()
    fake_gemini = FakeLlmScanService()
    fake_grok = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService()
    _override_all(fake_groq, fake_gemini, fake_grok, fake_legacy)
    client = TestClient(app)

    metadata = {"recognitionEngine": "legacy", "maxTickets": 3}

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake", "image/jpeg")},
            data={"metadata": json.dumps(metadata)},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert fake_legacy.called is True
    assert fake_groq.called is False
    assert fake_gemini.called is False
    assert fake_grok.called is False


def test_scan_grok_engine_runs_directly_when_requested(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", False)
    fake_groq = FakeLlmScanService()
    fake_gemini = FakeLlmScanService()
    fake_grok = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService(_weak_legacy_response())
    _override_all(fake_groq, fake_gemini, fake_grok, fake_legacy)
    client = TestClient(app)

    metadata = {"recognitionEngine": "grok"}

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake", "image/jpeg")},
            data={"metadata": json.dumps(metadata)},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert fake_grok.called is True
    assert fake_legacy.called is False
    assert fake_groq.called is False
    assert fake_gemini.called is False
    assert response.json()["data"]["recognitionEngineUsed"] == "grok"


def test_scan_gemini_engine_forwards_metadata(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", False)
    fake_groq = FakeLlmScanService()
    fake_gemini = FakeLlmScanService()
    fake_grok = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService(_weak_legacy_response())
    _override_all(fake_groq, fake_gemini, fake_grok, fake_legacy)
    client = TestClient(app)

    metadata = {
        "recognitionEngine": "gemini",
        "activeStations": [{"name": "Cần Thơ", "code": "CTH"}],
        "maxTickets": 5,
    }

    try:
        client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake", "image/jpeg")},
            data={"metadata": json.dumps(metadata)},
        )
    finally:
        app.dependency_overrides.clear()

    assert fake_gemini.received_metadata is not None
    assert fake_gemini.received_metadata.maxTickets == 5
    assert fake_gemini.received_metadata.activeStations[0].code == "CTH"


def test_scan_endpoint_rejects_invalid_metadata_json(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    fake_groq = FakeLlmScanService()
    fake_gemini = FakeLlmScanService()
    fake_grok = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService()
    _override_all(fake_groq, fake_gemini, fake_grok, fake_legacy)
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake", "image/jpeg")},
            data={"metadata": "{not-valid-json"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["success"] is False


def test_scan_vision_client_error_falls_back_to_legacy(monkeypatch):
    from infra.vision_extraction import VisionApiError

    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", False)
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LLM_FALLBACK_TO_LEGACY", True)

    class FailingGroq:
        def scan_image(self, image_bytes, metadata):
            raise VisionApiError("Groq API quota/token limit exceeded (HTTP 429)", status_code=429)

    fake_legacy = FakeLegacyScanService(_weak_legacy_response())
    _override_all(
        FailingGroq(),
        FakeLlmScanService(),
        FakeLlmScanService(),
        fake_legacy,
    )
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert fake_legacy.called is True
    assert body["data"]["ticketCount"] == 1
    assert body["data"]["recognitionEngineUsed"] == "legacy"
    assert any("OCR local" in w or "token" in w.lower() for w in body["data"]["warnings"])


def test_scan_vision_client_error_groq_first_without_fallback_returns_soft_empty(monkeypatch):
    from infra.vision_extraction import VisionClientError

    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", False)
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LLM_FALLBACK_TO_LEGACY", False)

    class FailingGroq:
        def scan_image(self, image_bytes, metadata):
            raise VisionClientError("empty model content")

    fake_legacy = FakeLegacyScanService()
    _override_all(
        FailingGroq(),
        FakeLlmScanService(),
        FakeLlmScanService(),
        fake_legacy,
    )
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert fake_legacy.called is False
    assert body["data"]["ticketCount"] == 0
    assert body["data"]["tickets"] == []
    assert any("Không thể đọc rõ" in w or "OCR local" in w for w in body["data"]["warnings"])


def test_scan_empty_llm_result_falls_back_to_legacy(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", False)
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LLM_FALLBACK_TO_LEGACY", True)

    class EmptyGroq:
        def scan_image(self, image_bytes, metadata):
            return ScanResponse(
                scanId="empty-scan",
                ticketCount=0,
                tickets=[],
                warnings=["Không nhận diện được vé"],
            )

    fake_legacy = FakeLegacyScanService(_weak_legacy_response())
    _override_all(
        EmptyGroq(),
        FakeLlmScanService(),
        FakeLlmScanService(),
        fake_legacy,
    )
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    body = response.json()
    assert body["success"] is True
    assert fake_legacy.called is True
    assert body["data"]["ticketCount"] == 1
    assert body["data"]["recognitionEngineUsed"] == "legacy"
    assert any("OCR local" in w for w in body["data"]["warnings"])


def test_scan_empty_shell_llm_result_falls_back_to_legacy(monkeypatch):
    """Groq returning ticket boxes without field text must fall back to Legacy."""
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LEGACY_FIRST", False)
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LLM_FALLBACK_TO_LEGACY", True)

    class EmptyShellGroq:
        def scan_image(self, image_bytes, metadata):
            return ScanResponse(
                scanId="shell-scan",
                ticketCount=2,
                tickets=[
                    TicketScanResult(
                        ticketIndex=0,
                        bbox=BoundingBox(
                            x=0,
                            y=0,
                            width=10,
                            height=10,
                            corners=[[0, 0], [10, 0], [10, 10], [0, 10]],
                        ),
                        status=TicketStatus.INCOMPLETE,
                        confidence=0.0,
                        extracted=ExtractedTicketFields(),
                        fieldConfidences={},
                        missingFields=["numbers", "serialNumber", "stationName", "drawDate"],
                        validationErrors=[],
                        croppedImageBase64=None,
                    ),
                    TicketScanResult(
                        ticketIndex=1,
                        bbox=BoundingBox(
                            x=20,
                            y=0,
                            width=10,
                            height=10,
                            corners=[[20, 0], [30, 0], [30, 10], [20, 10]],
                        ),
                        status=TicketStatus.INCOMPLETE,
                        confidence=0.0,
                        extracted=ExtractedTicketFields(),
                        fieldConfidences={},
                        missingFields=["numbers"],
                        validationErrors=[],
                        croppedImageBase64=None,
                    ),
                ],
                warnings=["Vé #1: OCR thất bại"],
            )

    fake_legacy = FakeLegacyScanService(_weak_legacy_response())
    _override_all(
        EmptyShellGroq(),
        FakeLlmScanService(),
        FakeLlmScanService(),
        fake_legacy,
    )
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    body = response.json()
    assert body["success"] is True
    assert body["data"]["recognitionEngineUsed"] == "legacy"
    assert body["data"]["ticketCount"] == 1
    assert any("OCR local" in w for w in body["data"]["warnings"])


def test_scan_forces_legacy_when_llm_circuit_open(monkeypatch):
    from infra import llm_circuit

    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr(llm_circuit.settings, "TICKET_VISION_LLM_CIRCUIT_COOLDOWN_SECONDS", 120)
    llm_circuit.trip("Groq TPD exhausted")

    fake_groq = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService(_weak_legacy_response())
    _override_all(fake_groq, FakeLlmScanService(), FakeLlmScanService(), fake_legacy)
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake", "image/jpeg")},
        )
        body = response.json()
    finally:
        app.dependency_overrides.clear()
        llm_circuit.reset_for_tests()

    assert fake_legacy.called is True
    assert fake_groq.called is False
    assert body["data"]["recognitionEngineUsed"] == "legacy"


def test_scan_forces_legacy_when_daily_llm_quota_exhausted(tmp_path, monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr(llm_quota.settings, "TICKET_VISION_LLM_DAILY_QUOTA", 1)
    llm_quota.set_quota_dir_for_tests(tmp_path / "quota-exhausted")
    # Consume the only slot before the scan.
    first = llm_quota.try_consume()
    assert first.exhausted is False
    second = llm_quota.try_consume()
    assert second.exhausted is True

    fake_groq = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService(_weak_legacy_response())
    _override_all(fake_groq, FakeLlmScanService(), FakeLlmScanService(), fake_legacy)
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    body = response.json()
    assert fake_legacy.called is True
    assert fake_groq.called is False
    assert body["data"]["recognitionEngineUsed"] == "legacy"
    assert any("hạn mức" in w.lower() or "OCR local" in w for w in body["data"]["warnings"])
