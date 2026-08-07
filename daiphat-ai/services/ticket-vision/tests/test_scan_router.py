import json

from fastapi.testclient import TestClient

from app.main import app
from domain.enums.ticket_status import TicketStatus
from dto.response.scan_response import (
    BoundingBox,
    ExtractedTicketFields,
    ScanResponse,
    TicketScanResult,
)
from routers.scan import get_ticket_scan_service


class FakeTicketScanService:
    """Test double standing in for TicketScanService -- lets the router be
    tested (request parsing, response envelope shape) without touching
    OpenCV detection or any OCR engine."""

    def __init__(self, response: ScanResponse) -> None:
        self._response = response
        self.received_metadata = None

    def scan_image(self, image_bytes, metadata):
        self.received_metadata = metadata
        return self._response


def _sample_response() -> ScanResponse:
    return ScanResponse(
        scanId="test-scan-id",
        ticketCount=1,
        tickets=[
            TicketScanResult(
                ticketIndex=0,
                bbox=BoundingBox(x=0, y=0, width=100, height=200, corners=[[0, 0], [100, 0], [100, 200], [0, 200]]),
                status=TicketStatus.COMPLETE,
                confidence=0.9,
                extracted=ExtractedTicketFields(
                    stationName="TP. Hồ Chí Minh",
                    stationCode="HCM",
                    serialNumber="A012345",
                    numbers="123456",
                    drawDate="2026-08-05",
                ),
                fieldConfidences={"stationName": 0.9, "serialNumber": 0.9, "numbers": 0.9, "drawDate": 0.9},
                missingFields=[],
                validationErrors=[],
                croppedImageBase64=None,
            )
        ],
        warnings=[],
    )


def test_scan_endpoint_returns_wrapped_scan_response():
    fake_service = FakeTicketScanService(_sample_response())
    app.dependency_overrides[get_ticket_scan_service] = lambda: fake_service
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"not-a-real-image-the-fake-service-ignores-bytes", "image/jpeg")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["scanId"] == "test-scan-id"
    assert body["data"]["tickets"][0]["status"] == "COMPLETE"
    assert body["data"]["tickets"][0]["extracted"]["stationName"] == "TP. Hồ Chí Minh"


def test_scan_endpoint_forwards_metadata_to_the_service():
    fake_service = FakeTicketScanService(_sample_response())
    app.dependency_overrides[get_ticket_scan_service] = lambda: fake_service
    client = TestClient(app)

    metadata = {"activeStations": [{"name": "Cần Thơ", "code": "CTH"}], "maxTickets": 5}

    try:
        client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake", "image/jpeg")},
            data={"metadata": json.dumps(metadata)},
        )
    finally:
        app.dependency_overrides.clear()

    assert fake_service.received_metadata is not None
    assert fake_service.received_metadata.maxTickets == 5
    assert fake_service.received_metadata.activeStations[0].code == "CTH"


def test_scan_endpoint_rejects_invalid_metadata_json():
    fake_service = FakeTicketScanService(_sample_response())
    app.dependency_overrides[get_ticket_scan_service] = lambda: fake_service
    client = TestClient(app)

    try:
        response = client.post(
            "/v1/scan",
            files={"file": ("ticket.jpg", b"fake", "image/jpeg")},
            data={"metadata": "{not-valid-json"},
        )
    finally:
        app.dependency_overrides.clear()

    # The envelope always answers 200; the error is carried in `success`/`message`
    # (matching contracts/api_response.py's convention used across the AI monorepo).
    assert response.status_code == 200
    assert response.json()["success"] is False


def test_health_check():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "up"
