from fastapi import APIRouter, Depends, File, Form, UploadFile

from contracts.api_response import APIResponse
from domain.detection.factory import TicketDetectorFactory
from domain.ocr.factory import OcrStrategyFactory
from domain.preprocessing.pipeline import ImageTooLargeError, InvalidImageError
from domain.scanning.ticket_scan_service import TicketScanService
from domain.validation.format_validator import FormatValidator
from dto.request.scan_metadata import ScanMetadata
from infra.config import settings
from infra.logger import logger

router = APIRouter(tags=["Scan"])

# Stateless and cheap to share across requests.
_validator = FormatValidator()


def get_ticket_scan_service() -> TicketScanService:
    """FastAPI dependency provider for TicketScanService.

    A fresh service instance is built per request (cheap: it just wires
    strategy objects together), but the strategies it wires -- the OCR
    readers in particular -- are process-wide singletons created once in
    domain/ocr/factory.py and lazily load their models on first use.

    Overridable per-test via `app.dependency_overrides[get_ticket_scan_service]`
    to inject a fake service without touching OpenCV/OCR at all.
    """
    return TicketScanService(
        detector=TicketDetectorFactory.create(),
        ocr_strategy=OcrStrategyFactory.create(),
        validator=_validator,
        max_file_size_mb=settings.TICKET_VISION_MAX_FILE_SIZE_MB,
        max_image_dimension=settings.TICKET_VISION_MAX_IMAGE_DIMENSION,
        station_fuzzy_threshold=settings.TICKET_VISION_STATION_FUZZY_MATCH_THRESHOLD,
        high_confidence_threshold=settings.TICKET_VISION_HIGH_CONFIDENCE_THRESHOLD,
        low_confidence_threshold=settings.TICKET_VISION_LOW_CONFIDENCE_THRESHOLD,
    )


@router.post("/scan", response_model=APIResponse)
async def scan_tickets(
    file: UploadFile = File(..., description="Ảnh chụp một hoặc nhiều vé số"),
    metadata: str | None = Form(
        None,
        description="JSON ScanMetadata: activeStations, maxTickets, detectorStrategy",
    ),
    service: TicketScanService = Depends(get_ticket_scan_service),
) -> APIResponse:
    try:
        scan_metadata = ScanMetadata.model_validate_json(metadata) if metadata else ScanMetadata()
    except ValueError as exc:
        return APIResponse.fail(message=f"metadata không hợp lệ: {exc}")

    try:
        image_bytes = await file.read()
        result = service.scan_image(image_bytes, scan_metadata)
    except (ImageTooLargeError, InvalidImageError) as exc:
        return APIResponse.fail(message=str(exc))
    except Exception:  # noqa: BLE001 -- never leak a stack trace to the client
        logger.exception("Unexpected error while scanning ticket image")
        return APIResponse.fail(message="Đã có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại.")

    return APIResponse.ok(data=result.model_dump(), message="Quét vé thành công.")
