from fastapi import APIRouter, Depends, File, Form, UploadFile
import asyncio
import uuid

from contracts.api_response import APIResponse
from domain.detection.factory import TicketDetectorFactory
from domain.ocr.factory import OcrStrategyFactory
from domain.preprocessing.pipeline import ImageTooLargeError, InvalidImageError
from domain.scanning.gemini_ticket_scan_service import GeminiTicketScanService
from domain.scanning.grok_ticket_scan_service import GrokTicketScanService
from domain.scanning.groq_ticket_scan_service import GroqTicketScanService
from domain.scanning.llm_ticket_scan_service import resolve_recognition_engine
from domain.scanning.ticket_scan_service import TicketScanService
from domain.validation.format_validator import FormatValidator
from dto.request.scan_metadata import ScanMetadata
from dto.response.scan_response import ScanResponse
from infra.config import settings
from infra import llm_circuit, llm_quota
from infra.logger import logger
from infra.model_manifest import load_model_manifest
from infra.vision_extraction import VisionClientError, VisionConfigurationError

router = APIRouter(tags=["Scan"])

_validator = FormatValidator()
_LLM_ENGINES = frozenset({"groq", "gemini", "grok"})


def _annotate_ops(result: ScanResponse, engine_used: str) -> ScanResponse:
    return result.model_copy(
        update={
            "recognitionEngineUsed": engine_used,
            "modelVersions": load_model_manifest(),
        }
    )


def _soft_unreadable_scan_response(warning: str) -> ScanResponse:
    """OCR recognition soft-fail: HTTP 200 with empty tickets + Vietnamese warning."""
    return _annotate_ops(
        ScanResponse(
            scanId=str(uuid.uuid4()),
            ticketCount=0,
            tickets=[],
            warnings=[warning],
            imageWidth=None,
            imageHeight=None,
        ),
        "none",
    )


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


def get_groq_ticket_scan_service() -> GroqTicketScanService:
    return GroqTicketScanService(**_llm_kwargs())


def get_gemini_ticket_scan_service() -> GeminiTicketScanService:
    return GeminiTicketScanService(**_llm_kwargs())


def get_grok_ticket_scan_service() -> GrokTicketScanService:
    return GrokTicketScanService(**_llm_kwargs())


# Backward-compatible alias for tests that override get_ticket_scan_service.
def get_ticket_scan_service() -> TicketScanService:
    return get_legacy_ticket_scan_service()


def _should_fallback_to_legacy(engine: str) -> bool:
    return (
        bool(getattr(settings, "TICKET_VISION_LLM_FALLBACK_TO_LEGACY", True))
        and engine in _LLM_ENGINES
    )


def _prepend_warning(result: ScanResponse, warning: str) -> ScanResponse:
    warnings = [warning, *(result.warnings or [])]
    # Deduplicate while preserving order.
    seen: set[str] = set()
    unique: list[str] = []
    for item in warnings:
        text = (item or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        unique.append(text)
    return result.model_copy(update={"warnings": unique})


def _user_message_for_vision_error(exc: VisionClientError) -> str:
    """Map provider errors to Admin-facing copy (avoid blaming a clean photo)."""
    from infra import llm_circuit

    status = getattr(exc, "status_code", None)
    detail = str(exc).lower()
    if status == 429 or "rate limit" in detail or "quota" in detail:
        if llm_circuit.looks_like_quota_exhaustion(detail) or "quota/token" in detail:
            return (
                "Hạn mức token AI (Groq) đã hết. "
                "Hệ thống chuyển sang OCR local — vui lòng đợi ảnh được xử lý."
            )
        return (
            "Dịch vụ AI đọc vé đang quá tải (giới hạn tốc độ Groq). "
            "Hệ thống sẽ thử OCR local nếu cấu hình cho phép."
        )
    if (
        status == 413
        or "too large" in detail
        or "itpm" in detail
        or "token budget" in detail
    ):
        return (
            "Ảnh quét quá nặng so với hạn mức token của dịch vụ AI. "
            "Vui lòng chụp gần hơn / một vé mỗi ảnh, hoặc thử lại sau vài giây."
        )
    if "too many images" in detail or "at most 3 images" in detail:
        return (
            "Yêu cầu OCR gửi quá nhiều ảnh phụ tới AI. "
            "Hệ thống đã giới hạn crop; vui lòng thử quét lại."
        )
    if status in (401, 403) or "authentication" in detail:
        return (
            "Không xác thực được dịch vụ AI đọc vé (GROQ_API_KEY). "
            "Vui lòng kiểm tra cấu hình rồi thử lại."
        )
    if "model" in detail and ("unavailable" in detail or "not_found" in detail):
        return (
            "Model AI đọc vé hiện không khả dụng. "
            "Vui lòng kiểm tra GROQ_VISION_MODEL rồi thử lại."
        )
    if "timed out" in detail or "timeout" in detail:
        return (
            "Dịch vụ AI đọc vé phản hồi quá chậm (timeout). "
            "Vui lòng thử lại với ảnh nhỏ hơn hoặc đợi giây lát."
        )
    return (
        "Không thể đọc rõ thông tin vé từ ảnh này. "
        "Một số thông tin trên vé bị che hoặc không đủ rõ để nhận diện. "
        "Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
    )


def _run_engine_scan(
    *,
    engine: str,
    image_bytes: bytes,
    scan_metadata: ScanMetadata,
    legacy_service: TicketScanService,
    groq_service: GroqTicketScanService,
    gemini_service: GeminiTicketScanService,
    grok_service: GrokTicketScanService,
) -> ScanResponse:
    if engine == "groq":
        return groq_service.scan_image(image_bytes, scan_metadata)
    if engine == "gemini":
        return gemini_service.scan_image(image_bytes, scan_metadata)
    if engine == "grok":
        return grok_service.scan_image(image_bytes, scan_metadata)
    return legacy_service.scan_image(image_bytes, scan_metadata)


def _fallback_to_legacy(
    *,
    engine: str,
    image_bytes: bytes,
    scan_metadata: ScanMetadata,
    legacy_service: TicketScanService,
    reason: str,
) -> ScanResponse:
    logger.warning(
        "%s scan unavailable (%s); falling back to legacy EasyOCR/PaddleOCR",
        engine,
        reason,
    )
    result = legacy_service.scan_image(image_bytes, scan_metadata)
    result = _prepend_warning(
        result,
        f"Đã chuyển sang OCR local (legacy) vì {engine} không dùng được: {reason}",
    )
    return _annotate_ops(result, "legacy")


def _scan_image_sync(
    *,
    engine: str,
    image_bytes: bytes,
    scan_metadata: ScanMetadata,
    legacy_service: TicketScanService,
    groq_service: GroqTicketScanService,
    gemini_service: GeminiTicketScanService,
    grok_service: GrokTicketScanService,
) -> ScanResponse:
    """Blocking OCR pipeline — always run via asyncio.to_thread from the route."""
    engine_used = engine

    # Circuit open (recent Groq TPD/token exhaustion): skip cloud, go local.
    if engine in _LLM_ENGINES:
        circuit = llm_circuit.snapshot()
        if circuit.open:
            return _fallback_to_legacy(
                engine=engine,
                image_bytes=image_bytes,
                scan_metadata=scan_metadata,
                legacy_service=legacy_service,
                reason=(
                    f"AI cloud tạm nghỉ sau khi hết hạn mức "
                    f"(còn ~{circuit.remainingSeconds}s). Dùng OCR local."
                ),
            )

        quota = llm_quota.try_consume()
        if quota.exhausted:
            logger.warning(
                "LLM daily quota exhausted (%s/%s on %s); forcing legacy OCR",
                quota.used,
                quota.limit,
                quota.date,
            )
            return _fallback_to_legacy(
                engine=engine,
                image_bytes=image_bytes,
                scan_metadata=scan_metadata,
                legacy_service=legacy_service,
                reason=(
                    f"đã hết hạn mức quét AI trong ngày ({quota.used}/{quota.limit}). "
                    "Hệ thống dùng OCR local."
                ),
            )

    try:
        result = _run_engine_scan(
            engine=engine,
            image_bytes=image_bytes,
            scan_metadata=scan_metadata,
            legacy_service=legacy_service,
            groq_service=groq_service,
            gemini_service=gemini_service,
            grok_service=grok_service,
        )
        engine_used = engine
        if (
            _should_fallback_to_legacy(engine)
            and (not result.tickets or result.ticketCount == 0)
        ):
            try:
                legacy_result = _fallback_to_legacy(
                    engine=engine,
                    image_bytes=image_bytes,
                    scan_metadata=scan_metadata,
                    legacy_service=legacy_service,
                    reason="không nhận diện được vé qua AI",
                )
                if legacy_result.tickets:
                    merged = list(legacy_result.warnings or [])
                    for warning in result.warnings or []:
                        if warning and warning not in merged:
                            merged.append(warning)
                    result = legacy_result.model_copy(update={"warnings": merged})
                    engine_used = "legacy"
            except Exception:  # noqa: BLE001
                logger.exception(
                    "Legacy fallback after empty %s result also failed; keeping LLM empty response",
                    engine,
                )
        return _annotate_ops(result, engine_used)
    except (ImageTooLargeError, InvalidImageError) as exc:
        logger.warning("Invalid ticket image upload: %s", exc)
        return _soft_unreadable_scan_response(
            "Ảnh không hợp lệ hoặc quá lớn. Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
        )
    except VisionConfigurationError as exc:
        if _should_fallback_to_legacy(engine):
            try:
                return _fallback_to_legacy(
                    engine=engine,
                    image_bytes=image_bytes,
                    scan_metadata=scan_metadata,
                    legacy_service=legacy_service,
                    reason=str(exc),
                )
            except Exception:  # noqa: BLE001
                logger.exception("Legacy fallback after %s misconfiguration failed", engine)
        logger.error("%s ticket scan misconfigured: %s", engine, exc)
        raise
    except VisionClientError as exc:
        provider_message = _user_message_for_vision_error(exc)
        status = getattr(exc, "status_code", None)
        detail = str(exc)
        if status == 429 or llm_circuit.looks_like_quota_exhaustion(detail):
            llm_circuit.trip(detail[:200] or provider_message)
        if _should_fallback_to_legacy(engine):
            try:
                result = _fallback_to_legacy(
                    engine=engine,
                    image_bytes=image_bytes,
                    scan_metadata=scan_metadata,
                    legacy_service=legacy_service,
                    reason=provider_message,
                )
                result = _prepend_warning(result, provider_message)
                return _annotate_ops(result, "legacy")
            except Exception:  # noqa: BLE001
                logger.exception("Legacy fallback after %s VisionClientError failed", engine)
        logger.warning("%s ticket scan soft-failed: %s", engine, exc)
        return _soft_unreadable_scan_response(provider_message)
    except Exception:  # noqa: BLE001
        logger.exception("Unexpected error while scanning ticket image — soft unreadable")
        return _soft_unreadable_scan_response(
            "Không thể đọc rõ thông tin vé từ ảnh này. "
            "Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
        )


@router.post("/scan", response_model=APIResponse)
async def scan_tickets(
    file: UploadFile = File(..., description="Ảnh chụp một hoặc nhiều vé số"),
    metadata: str | None = Form(
        None,
        description=(
            "JSON ScanMetadata: activeStations, maxTickets, detectorStrategy, "
            "recognitionEngine (groq|gemini|grok|legacy)"
        ),
    ),
    legacy_service: TicketScanService = Depends(get_legacy_ticket_scan_service),
    groq_service: GroqTicketScanService = Depends(get_groq_ticket_scan_service),
    gemini_service: GeminiTicketScanService = Depends(get_gemini_ticket_scan_service),
    grok_service: GrokTicketScanService = Depends(get_grok_ticket_scan_service),
) -> APIResponse:
    try:
        scan_metadata = ScanMetadata.model_validate_json(metadata) if metadata else ScanMetadata()
    except ValueError as exc:
        return APIResponse.fail(message=f"metadata không hợp lệ: {exc}")

    engine = resolve_recognition_engine(
        scan_metadata,
        settings.TICKET_VISION_RECOGNITION_ENGINE or "groq",
    )

    image_bytes = await file.read()

    try:
        # Keep the event loop free: EasyOCR/YOLO must not block other /health or scans.
        result = await asyncio.to_thread(
            _scan_image_sync,
            engine=engine,
            image_bytes=image_bytes,
            scan_metadata=scan_metadata,
            legacy_service=legacy_service,
            groq_service=groq_service,
            gemini_service=gemini_service,
            grok_service=grok_service,
        )
    except VisionConfigurationError:
        return APIResponse.fail(
            message=f"Cấu hình dịch vụ quét vé ({engine}) chưa sẵn sàng."
        )
    except Exception:  # noqa: BLE001
        # Native/worker failures must not become an unhandled ASGI crash.
        logger.exception("ticket-vision /scan worker failed — soft unreadable response")
        result = _soft_unreadable_scan_response(
            "Không thể đọc rõ thông tin vé từ ảnh này. "
            "Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
        )

    message = "Quét vé thành công."
    if result.warnings:
        message = result.warnings[0]
    elif result.ticketCount == 0:
        message = "Không nhận diện được vé từ ảnh này."
    return APIResponse.ok(data=result.model_dump(), message=message)
