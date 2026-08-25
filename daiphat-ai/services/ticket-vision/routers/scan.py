from fastapi import APIRouter, Depends, File, Form, UploadFile
import uuid

from contracts.api_response import APIResponse
from domain.detection.factory import TicketDetectorFactory
from domain.ocr.factory import OcrStrategyFactory
from domain.preprocessing.pipeline import ImageTooLargeError, InvalidImageError
from domain.scanning.gemini_ticket_scan_service import GeminiTicketScanService
from domain.scanning.grok_ticket_scan_service import GrokTicketScanService
from domain.scanning.llm_ticket_scan_service import resolve_recognition_engine
from domain.scanning.ticket_scan_service import TicketScanService
from domain.validation.format_validator import FormatValidator
from dto.request.scan_metadata import ScanMetadata
from dto.response.scan_response import ScanResponse
from infra.config import settings
from infra.logger import logger
from infra.vision_extraction import VisionClientError, VisionConfigurationError

router = APIRouter(tags=["Scan"])

_validator = FormatValidator()


def _llm_kwargs() -> dict:
    return {
        "validator": _validator,
        "max_file_size_mb": settings.TICKET_VISION_MAX_FILE_SIZE_MB,
        "max_image_dimension": settings.TICKET_VISION_MAX_IMAGE_DIMENSION,
        "max_tickets_per_image": settings.TICKET_VISION_MAX_TICKETS_PER_IMAGE,
        "station_fuzzy_threshold": settings.TICKET_VISION_STATION_FUZZY_MATCH_THRESHOLD,
        "high_confidence_threshold": settings.TICKET_VISION_HIGH_CONFIDENCE_THRESHOLD,
        "low_confidence_threshold": settings.TICKET_VISION_LOW_CONFIDENCE_THRESHOLD,
    }


def get_legacy_ticket_scan_service() -> TicketScanService:
    return TicketScanService(
        detector_provider=TicketDetectorFactory.create,
        ocr_strategy=OcrStrategyFactory.create(),
        validator=_validator,
        max_file_size_mb=settings.TICKET_VISION_MAX_FILE_SIZE_MB,
        max_image_dimension=settings.TICKET_VISION_MAX_IMAGE_DIMENSION,
        station_fuzzy_threshold=settings.TICKET_VISION_STATION_FUZZY_MATCH_THRESHOLD,
        high_confidence_threshold=settings.TICKET_VISION_HIGH_CONFIDENCE_THRESHOLD,
        low_confidence_threshold=settings.TICKET_VISION_LOW_CONFIDENCE_THRESHOLD,
    )


def get_gemini_ticket_scan_service() -> GeminiTicketScanService:
    return GeminiTicketScanService(**_llm_kwargs())


def get_grok_ticket_scan_service() -> GrokTicketScanService:
    return GrokTicketScanService(**_llm_kwargs())


# Backward-compatible alias for tests that override get_ticket_scan_service.
def get_ticket_scan_service() -> TicketScanService:
    return get_legacy_ticket_scan_service()


def _soft_unreadable_scan_response(warning: str) -> ScanResponse:
    """OCR recognition soft-fail: HTTP 200 with empty tickets + Vietnamese warning."""
    return ScanResponse(
        scanId=str(uuid.uuid4()),
        ticketCount=0,
        tickets=[],
        warnings=[warning],
        imageWidth=None,
        imageHeight=None,
    )


@router.post("/scan", response_model=APIResponse)
async def scan_tickets(
    file: UploadFile = File(..., description="Ảnh chụp một hoặc nhiều vé số"),
    metadata: str | None = Form(
        None,
        description=(
            "JSON ScanMetadata: activeStations, maxTickets, detectorStrategy, "
            "recognitionEngine (gemini|grok|legacy)"
        ),
    ),
    legacy_service: TicketScanService = Depends(get_legacy_ticket_scan_service),
    gemini_service: GeminiTicketScanService = Depends(get_gemini_ticket_scan_service),
    grok_service: GrokTicketScanService = Depends(get_grok_ticket_scan_service),
) -> APIResponse:
    try:
        scan_metadata = ScanMetadata.model_validate_json(metadata) if metadata else ScanMetadata()
    except ValueError as exc:
        return APIResponse.fail(message=f"metadata không hợp lệ: {exc}")

    engine = resolve_recognition_engine(
        scan_metadata,
        settings.TICKET_VISION_RECOGNITION_ENGINE,
    )

    try:
        image_bytes = await file.read()
        if engine == "gemini":
            result = gemini_service.scan_image(image_bytes, scan_metadata)
        elif engine == "grok":
            result = grok_service.scan_image(image_bytes, scan_metadata)
        else:
            result = legacy_service.scan_image(image_bytes, scan_metadata)
    except (ImageTooLargeError, InvalidImageError) as exc:
        # Invalid upload — still soft so BE can show FAILED placeholder.
        logger.warning("Invalid ticket image upload: %s", exc)
        result = _soft_unreadable_scan_response(
            "Ảnh không hợp lệ hoặc quá lớn. Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
        )
        return APIResponse.ok(data=result.model_dump(), message=result.warnings[0])
    except VisionConfigurationError as exc:
        logger.error("%s ticket scan misconfigured: %s", engine, exc)
        return APIResponse.fail(
            message=f"Cấu hình dịch vụ quét vé ({engine}) chưa sẵn sàng."
        )
    except VisionClientError as exc:
        # Blurry / empty / parse / API recognition soft-fail → structured ok.
        logger.warning("%s ticket scan soft-failed: %s", engine, exc)
        result = _soft_unreadable_scan_response(
            "Không thể đọc rõ thông tin vé từ ảnh này. "
            "Một số thông tin trên vé bị che hoặc không đủ rõ để nhận diện. "
            "Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
        )
        return APIResponse.ok(data=result.model_dump(), message=result.warnings[0])
    except Exception:  # noqa: BLE001 -- never leak a stack trace to the client
        logger.exception("Unexpected error while scanning ticket image — soft unreadable")
        result = _soft_unreadable_scan_response(
            "Không thể đọc rõ thông tin vé từ ảnh này. "
            "Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
        )
        return APIResponse.ok(data=result.model_dump(), message=result.warnings[0])

    return APIResponse.ok(data=result.model_dump(), message="Quét vé thành công.")
