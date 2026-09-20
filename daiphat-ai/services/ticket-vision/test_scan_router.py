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
    llm_quota.set_quota_dir_for_tests(tmp_path / "quota")
    llm_circuit.reset_for_tests()
    yield
    llm_quota.set_quota_dir_for_tests(None)
    llm_circuit.reset_for_tests()


class FakeLegacyScanService:
    def __init__(self) -> None:
        self.called = False

    def scan_image(self, image_bytes, metadata):
        self.called = True
        return _sample_response()


class FakeLlmScanService:
    def __init__(self) -> None:
        self.called = False
        self.received_metadata = None

    def scan_image(self, image_bytes, metadata):
        self.called = True
        self.received_metadata = metadata
        return _sample_response()


def _sample_response() -> ScanResponse:
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
                status=TicketStatus.COMPLETE,
                confidence=0.9,
                extracted=ExtractedTicketFields(
                    stationName="TP. Hồ Chí Minh",
                    stationCode="HCM",
                    serialNumber="A012345",
                    numbers="123456",
                    drawDate="2026-08-05",
                ),
                fieldConfidences={
                    "stationName": 0.9,
                    "serialNumber": 0.9,
                    "numbers": 0.9,
                    "drawDate": 0.9,
                },
                missingFields=[],
                validationErrors=[],
                croppedImageBase64=None,
            )
        ],
        warnings=[],
    )


def _override_all(fake_groq, fake_gemini, fake_grok, fake_legacy):
    app.dependency_overrides[get_groq_ticket_scan_service] = lambda: fake_groq
    app.dependency_overrides[get_gemini_ticket_scan_service] = lambda: fake_gemini
    app.dependency_overrides[get_grok_ticket_scan_service] = lambda: fake_grok
    app.dependency_overrides[get_legacy_ticket_scan_service] = lambda: fake_legacy


def test_scan_default_routes_to_groq_service(monkeypatch):
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
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert fake_groq.called is True
    assert fake_gemini.called is False
    assert fake_grok.called is False
    assert fake_legacy.called is False


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


def test_scan_grok_engine_routes_to_grok_service(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    fake_groq = FakeLlmScanService()
    fake_gemini = FakeLlmScanService()
    fake_grok = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService()
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
    assert fake_groq.called is False
    assert fake_gemini.called is False


def test_scan_gemini_engine_forwards_metadata(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    fake_groq = FakeLlmScanService()
    fake_gemini = FakeLlmScanService()
    fake_grok = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService()
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
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LLM_FALLBACK_TO_LEGACY", True)

    class FailingGroq:
        def scan_image(self, image_bytes, metadata):
            raise VisionApiError("Groq API rate limit exceeded (HTTP 429)", status_code=429)

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
    assert fake_legacy.called is True
    assert body["data"]["ticketCount"] == 1
    assert any("legacy" in w.lower() or "OCR local" in w for w in body["data"]["warnings"])


def test_scan_vision_client_error_without_fallback_returns_soft_empty(monkeypatch):
    from infra.vision_extraction import VisionClientError

    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
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
    assert any("Không thể đọc rõ" in w for w in body["data"]["warnings"])


def test_scan_empty_llm_result_falls_back_to_legacy(monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_LLM_FALLBACK_TO_LEGACY", True)

    class EmptyGroq:
        def scan_image(self, image_bytes, metadata):
            return ScanResponse(
                scanId="empty-scan",
                ticketCount=0,
                tickets=[],
                warnings=["Không nhận diện được vé"],
            )

    fake_legacy = FakeLegacyScanService()
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

    assert response.status_code == 200
    body = response.json()
    assert fake_legacy.called is True
    assert body["data"]["ticketCount"] == 1


def test_health_check(monkeypatch):
    monkeypatch.setattr("main.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr("main.settings.GROQ_API_KEY", "test-key")
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "up"
    assert data["recognitionEngine"] == "groq"
    assert data["visionReady"] is True
    assert "llmQuota" in data
    assert "llmCircuit" in data
    assert "modelVersions" in data
    assert "yoloVersion" in data["modelVersions"]


def test_scan_forces_legacy_when_llm_circuit_open(monkeypatch):
    from infra import llm_circuit

    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr(llm_circuit.settings, "TICKET_VISION_LLM_CIRCUIT_COOLDOWN_SECONDS", 120)
    llm_circuit.trip("Groq TPD exhausted")

    fake_groq = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService()
    _override_all(fake_groq, FakeLlmScanService(), FakeLlmScanService(), fake_legacy)
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake-image-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()
        llm_circuit.reset_for_tests()

    assert response.status_code == 200
    body = response.json()
    assert fake_groq.called is False
    assert fake_legacy.called is True
    assert body["data"]["recognitionEngineUsed"] == "legacy"
    assert any("local" in w.lower() or "hạn mức" in w.lower() for w in body["data"]["warnings"])


def test_scan_forces_legacy_when_daily_llm_quota_exhausted(tmp_path, monkeypatch):
    monkeypatch.setattr("routers.scan.settings.TICKET_VISION_RECOGNITION_ENGINE", "groq")
    monkeypatch.setattr(llm_quota.settings, "TICKET_VISION_LLM_DAILY_QUOTA", 1)
    llm_quota.set_quota_dir_for_tests(tmp_path / "quota-exhausted")
    # Consume the single allowance.
    assert not llm_quota.try_consume().exhausted

    fake_groq = FakeLlmScanService()
    fake_legacy = FakeLegacyScanService()
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
    assert fake_groq.called is False
    assert fake_legacy.called is True
    assert body["data"]["ticketCount"] == 1
    assert body["data"]["recognitionEngineUsed"] == "legacy"
    assert any("hạn mức" in w.lower() or "legacy" in w.lower() for w in body["data"]["warnings"])
