from fastapi import APIRouter, Depends, File, Form, UploadFile
import asyncio
import time
import uuid

from contracts.api_response import APIResponse
from domain.detection.factory import TicketDetectorFactory
from domain.enums.ticket_status import TicketStatus
from domain.ocr.factory import OcrStrategyFactory
from domain.preprocessing.pipeline import ImageTooLargeError, InvalidImageError
from domain.scanning.gemini_ticket_scan_service import GeminiTicketScanService
from domain.scanning.grok_ticket_scan_service import GrokTicketScanService
from domain.scanning.groq_ticket_scan_service import GroqTicketScanService
from domain.scanning.llm_ticket_scan_service import resolve_recognition_engine
from domain.scanning.ticket_scan_service import TicketScanService
from domain.scanning.status_resolver import resolve_status
from domain.validation.format_validator import FormatValidator
from dto.request.scan_metadata import ScanMetadata
from dto.response.scan_response import (
    ExtractedTicketFields,
    ScanResponse,
    TicketScanResult,
)
from domain.validation.format_validator import SERIAL_PATTERN, is_valid_serial_number
from infra.config import settings
from infra import llm_circuit, llm_quota
from infra.logger import logger
from infra.model_manifest import load_model_manifest
from infra.vision_extraction import VisionClientError, VisionConfigurationError

router = APIRouter(tags=["Scan"])

_validator = FormatValidator()
_LLM_ENGINES = frozenset({"groq", "gemini", "grok"})


def _bbox_iou(a, b) -> float:
    if a is None or b is None:
        return 0.0
    ax2, ay2 = a.x + a.width, a.y + a.height
    bx2, by2 = b.x + b.width, b.y + b.height
    ix1, iy1 = max(a.x, b.x), max(a.y, b.y)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    union = a.width * a.height + b.width * b.height - inter
    return inter / union if union > 0 else 0.0


def _retry_missing_template_serials(
    legacy_result: ScanResponse,
    llm_result: ScanResponse,
    image_bytes: bytes,
    metadata: ScanMetadata,
    legacy_service: TicketScanService,
) -> ScanResponse:
    """Use the issuer learned by the LLM to locate a missed per-ticket template.

    A mixed-ticket image has no single request-level issuer. Its local pass may
    miss a logo-only issuer, while the later LLM pass recognizes that issuer.
    Only then retry that ticket's configured Serial region or symbol region.
    """
    retry = getattr(legacy_service, "retry_template_serial_for_known_station", None)
    if not callable(retry):
        return legacy_result
    tickets = list(legacy_result.tickets or [])
    if not tickets or not metadata.stationTemplates:
        return legacy_result
    consumed: set[int] = set()
    for llm_ticket in llm_result.tickets or []:
        extracted = llm_ticket.extracted
        if not extracted:
            continue
        code = (extracted.stationCode or "").strip().casefold()
        name = (extracted.stationName or "").strip().casefold()
        code_match = next(
            (s for s in metadata.activeStations if code and (s.code or "").casefold() == code),
            None,
        )
        name_match = next(
            (s for s in metadata.activeStations if name and s.name.casefold() == name),
            None,
        )
        if code_match and name_match and code_match.id != name_match.id:
            continue
        station = code_match or name_match
        if station is None or station.id is None:
            continue
        template = next(
            (t for t in metadata.stationTemplates if t.stationId == station.id), None
        )
        if template is None or not any(
            layout.fieldName in {"serialNumber", "serialSymbol"}
            for layout in template.fieldLayouts
        ):
            continue
        ranked = sorted(
            ((i, _bbox_iou(ticket.bbox, llm_ticket.bbox))
             for i, ticket in enumerate(tickets) if i not in consumed),
            key=lambda pair: pair[1], reverse=True,
        )
        if not ranked or ranked[0][1] < 0.15:
            continue
        index = ranked[0][0]
        consumed.add(index)
        local = tickets[index]
        local_extracted = local.extracted
        if not local_extracted or SERIAL_PATTERN.fullmatch(local_extracted.serialNumber or ""):
            continue
        if "serialNumber" in (local.usedFieldLayouts or {}) or "serialSymbol" in (local.usedFieldLayouts or {}):
            continue  # The correct template was already attempted; do not re-read it.
        if local_extracted.stationCode and station.code and local_extracted.stationCode.casefold() != station.code.casefold():
            continue
        numbers = local_extracted.numbers if _numbers_ok(local_extracted.numbers) else extracted.numbers
        numbers_confidence = (
            float((local.fieldConfidences or {}).get("numbers") or 0.0)
            if _numbers_ok(local_extracted.numbers)
            else float((llm_ticket.fieldConfidences or {}).get("numbers") or 0.0)
        )
        try:
            tickets[index] = retry(
                image_bytes, metadata, local, station.id, numbers, numbers_confidence
            )
        except Exception:  # noqa: BLE001 -- keep the first OCR result on retry failure
            logger.exception("Serial template retry failed for ticket #%s stationId=%s", index, station.id)
    return legacy_result.model_copy(update={"tickets": tickets})


def _field_nonempty(value: str | None) -> bool:
    return bool((value or "").strip())


def _numbers_ok(value: str | None) -> bool:
    text = (value or "").strip()
    return bool(text) and text.isdigit() and len(text) == 6


def _merge_extracted_prefer_grounded(
    legacy: ExtractedTicketFields | None,
    llm: ExtractedTicketFields | None,
) -> ExtractedTicketFields:
    """Keep local OCR when both sides have a value but disagree.

    Collage LLM boost often swaps stations/numbers across tickets in one
    photo (HCM crop labeled Tây Ninh / 626621). Prefer grounded legacy
    readings for core fields; fill gaps from LLM.
    """
    base = (llm or ExtractedTicketFields()).model_copy()
    if legacy is None:
        return base

    # Numbers: never let LLM overwrite a valid 6-digit local read.
    if _numbers_ok(legacy.numbers):
        if not _numbers_ok(base.numbers) or base.numbers != legacy.numbers:
            base.numbers = legacy.numbers

    # Station: keep local when present (banner OCR + fuzzy match).
    if _field_nonempty(legacy.stationName):
        llm_station = (base.stationName or "").strip()
        legacy_station = (legacy.stationName or "").strip()
        codes_differ = bool(legacy.stationCode) and bool(base.stationCode) and (
            legacy.stationCode != base.stationCode
        )
        if not llm_station or codes_differ or llm_station != legacy_station:
            base.stationName = legacy.stationName
            base.stationCode = legacy.stationCode

    # Date: keep local ISO when LLM invents an unrelated calendar day.
    if _field_nonempty(legacy.drawDate):
        if not _field_nonempty(base.drawDate) or base.drawDate != legacy.drawDate:
            base.drawDate = legacy.drawDate

    if is_valid_serial_number(legacy.serialNumber) and not is_valid_serial_number(base.serialNumber):
        base.serialNumber = legacy.serialNumber

    if _field_nonempty(legacy.batchCode):
        if not _field_nonempty(base.batchCode) or base.batchCode != legacy.batchCode:
            base.batchCode = legacy.batchCode

    if _field_nonempty(legacy.ticketType) and not _field_nonempty(base.ticketType):
        base.ticketType = legacy.ticketType

    return base


def _merge_boost_with_legacy(legacy_result: ScanResponse, llm_result: ScanResponse) -> ScanResponse:
    """Match tickets by bbox IoU and merge fields so collage mixups don't win."""
    legacy_tickets = list(legacy_result.tickets or [])
    llm_tickets = list(llm_result.tickets or [])
    if not legacy_tickets or not llm_tickets:
        return llm_result

    used_legacy: set[int] = set()
    merged_tickets: list[TicketScanResult] = []

    for llm_ticket in llm_tickets:
        best_i = -1
        best_iou = 0.0
        for i, legacy_ticket in enumerate(legacy_tickets):
            if i in used_legacy:
                continue
            iou = _bbox_iou(llm_ticket.bbox, legacy_ticket.bbox)
            if iou > best_iou:
                best_iou = iou
                best_i = i
        legacy_ticket = legacy_tickets[best_i] if best_i >= 0 and best_iou >= 0.15 else None
        if best_i >= 0 and legacy_ticket is not None:
            used_legacy.add(best_i)

        extracted = _merge_extracted_prefer_grounded(
            legacy_ticket.extracted if legacy_ticket else None,
            llm_ticket.extracted,
        )
        # The selected template determines the source: tagged Serial first;
        # only templates without that tag use numbers + serial symbol.
        serial_layouts = set(legacy_ticket.usedFieldLayouts or {}) if legacy_ticket else set()
        serial_boxes = set(legacy_ticket.sourceFieldBoxes or {}) if legacy_ticket else set()
        direct_serial_tag = "serialNumber" in serial_layouts or "serialNumber" in serial_boxes
        symbol_tag = "serialSymbol" in serial_layouts or "serialSymbol" in serial_boxes
        template_serial_attempted = direct_serial_tag or symbol_tag
        local_serial = legacy_ticket.extracted.serialNumber if template_serial_attempted and legacy_ticket.extracted else None
        extracted.serialNumber = local_serial if SERIAL_PATTERN.fullmatch(local_serial or "") else None
        template_batch_attempted = bool(
            legacy_ticket and "batchCode" in (legacy_ticket.usedFieldLayouts or {})
        )
        if template_batch_attempted:
            extracted.batchCode = legacy_ticket.extracted.batchCode if legacy_ticket.extracted else None
        field_boxes = dict(llm_ticket.fieldBoxes or {})
        if not direct_serial_tag:
            field_boxes.pop("serialNumber", None)
        if legacy_ticket and legacy_ticket.fieldBoxes:
            for name, box in legacy_ticket.fieldBoxes.items():
                if name == "serialNumber":
                    if direct_serial_tag:
                        field_boxes[name] = box
                else:
                    field_boxes.setdefault(name, box)

        field_conf = dict(llm_ticket.fieldConfidences or {})
        field_conf["serialNumber"] = 0.0
        if symbol_tag and not direct_serial_tag:
            field_conf["serialSymbol"] = float(
                (legacy_ticket.fieldConfidences or {}).get("serialSymbol", 0.0)
            )
        if template_batch_attempted:
            field_conf["batchCode"] = 0.0
        if legacy_ticket and legacy_ticket.fieldConfidences:
            for name, conf in legacy_ticket.fieldConfidences.items():
                # Keep legacy confidence when we kept the legacy value.
                legacy_val = getattr(legacy_ticket.extracted, name, None) if legacy_ticket.extracted else None
                merged_val = getattr(extracted, name, None)
                if legacy_val and merged_val and str(legacy_val) == str(merged_val):
                    field_conf[name] = max(float(field_conf.get(name, 0.0)), float(conf or 0.0))
        if template_serial_attempted:
            field_conf["serialNumber"] = (
                float((legacy_ticket.fieldConfidences or {}).get("serialNumber", 0.0))
                if extracted.serialNumber else 0.0
            )

        used_layouts = dict(llm_ticket.usedFieldLayouts or {})
        source_field_boxes = dict(llm_ticket.sourceFieldBoxes or {})
        if legacy_ticket:
            used_layouts.update(legacy_ticket.usedFieldLayouts or {})
            source_field_boxes.update(legacy_ticket.sourceFieldBoxes or {})
        if not direct_serial_tag:
            used_layouts.pop("serialNumber", None)
            source_field_boxes.pop("serialNumber", None)

        status = llm_ticket.status
        confidence = llm_ticket.confidence
        missing_fields = llm_ticket.missingFields
        validation_errors = llm_ticket.validationErrors
        if template_serial_attempted or template_batch_attempted or extracted.serialNumber is None:
            validation = FormatValidator().validate(extracted)
            status, confidence = resolve_status(
                field_conf,
                validation,
                settings.TICKET_VISION_HIGH_CONFIDENCE_THRESHOLD,
                settings.TICKET_VISION_LOW_CONFIDENCE_THRESHOLD,
            )
            missing_fields = validation.missing_fields
            validation_errors = validation.errors

        cropped = llm_ticket.croppedImageBase64 or (
            legacy_ticket.croppedImageBase64 if legacy_ticket else None
        )
        # Prefer the YOLO/legacy crop — it matches the bbox; collage LLM may
        # attach an unrelated preview.
        if legacy_ticket and legacy_ticket.croppedImageBase64:
            cropped = legacy_ticket.croppedImageBase64

        merged_tickets.append(
            llm_ticket.model_copy(
                update={
                    "extracted": extracted,
                    "fieldBoxes": field_boxes,
                    "fieldConfidences": field_conf,
                    "usedFieldLayouts": used_layouts,
                    "sourceFieldBoxes": source_field_boxes,
                    "status": status,
                    "confidence": confidence,
                    "missingFields": missing_fields,
                    "validationErrors": validation_errors,
                    "croppedImageBase64": cropped,
                    "bbox": legacy_ticket.bbox if legacy_ticket else llm_ticket.bbox,
                }
            )
        )

    warnings = list(llm_result.warnings or [])
    for warning in legacy_result.warnings or []:
        if warning and warning not in warnings:
            warnings.append(warning)
    warnings.append(
        "Đã kết hợp OCR local với AI (giữ dãy số/nhà đài local khi AI lệch)."
    )
    return llm_result.model_copy(
        update={
            "tickets": merged_tickets,
            "ticketCount": len(merged_tickets),
            "warnings": warnings,
        }
    )


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


def _legacy_first_enabled() -> bool:
    return bool(getattr(settings, "TICKET_VISION_LEGACY_FIRST", True))


def _has_serial_template(scan_metadata: ScanMetadata) -> bool:
    """Serial values require the issuer's tagged region or tagged symbol."""
    layouts = list(scan_metadata.fieldLayouts or [])
    for template in scan_metadata.stationTemplates or []:
        layouts.extend(template.fieldLayouts or [])
    return any(layout.fieldName in {"serialNumber", "serialSymbol"} for layout in layouts)


def _legacy_skip_llm_min_confidence() -> float:
    configured = getattr(settings, "TICKET_VISION_LEGACY_SKIP_LLM_MIN_CONFIDENCE", None)
    if configured is not None:
        return float(configured)
    return float(settings.TICKET_VISION_HIGH_CONFIDENCE_THRESHOLD)


def _legacy_needs_llm_boost(result: ScanResponse) -> bool:
    """True when local OCR is missing tickets or below the skip-LLM threshold."""
    tickets = list(result.tickets or [])
    if not tickets or int(result.ticketCount or 0) <= 0:
        return True
    min_conf = _legacy_skip_llm_min_confidence()
    for ticket in tickets:
        status = ticket.status
        status_value = status.value if isinstance(status, TicketStatus) else str(status or "")
        if status_value != TicketStatus.COMPLETE.value:
            return True
        confidence = float(ticket.confidence or 0.0)
        if confidence < min_conf:
            return True
        if ticket.missingFields:
            return True
        if ticket.validationErrors:
            return True
    return False


def _llm_result_is_usable(result: ScanResponse) -> bool:
    """Reject empty YOLO shells / failed collage responses that only have boxes."""
    tickets = list(result.tickets or [])
    if not tickets or int(result.ticketCount or 0) <= 0:
        return False
    for ticket in tickets:
        extracted = ticket.extracted
        if extracted is None:
            continue
        if any(
            [
                bool((extracted.numbers or "").strip()),
                bool((extracted.serialNumber or "").strip()),
                bool((extracted.stationName or "").strip()),
                bool((extracted.drawDate or "").strip()),
            ]
        ):
            return True
    return False


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


def _keep_legacy_result(legacy_result: ScanResponse, warning: str) -> ScanResponse:
    """Return the already-computed local OCR result (no second legacy pass)."""
    return _annotate_ops(_prepend_warning(legacy_result, warning), "legacy")


def _user_message_for_vision_error(exc: VisionClientError) -> str:
    """Map provider errors to Admin-facing copy (avoid blaming a clean photo)."""
    from infra import llm_circuit

    status = getattr(exc, "status_code", None)
    detail = str(exc).lower()
    if status == 429 or "rate limit" in detail or "quota" in detail:
        if llm_circuit.looks_like_quota_exhaustion(detail) or "quota/token" in detail:
            return (
                "Hạn mức token AI (Groq) đã hết. "
                "Hệ thống giữ kết quả OCR local."
            )
        return (
            "Dịch vụ AI đọc vé đang quá tải (giới hạn tốc độ Groq). "
            "Hệ thống giữ kết quả OCR local nếu có."
        )
    if (
        status == 413
        or "too large" in detail
        or "itpm" in detail
        or "token budget" in detail
    ):
        return (
            "Ảnh quét quá nặng so với hạn mức token của dịch vụ AI. "
            "Hệ thống giữ kết quả OCR local nếu có."
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
            "Hệ thống giữ kết quả OCR local nếu có."
        )
    return (
        "Không thể đọc rõ thông tin vé từ ảnh này bằng AI. "
        "Hệ thống giữ kết quả OCR local nếu có."
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


def _scan_legacy_first(
    *,
    engine: str,
    image_bytes: bytes,
    scan_metadata: ScanMetadata,
    legacy_service: TicketScanService,
    groq_service: GroqTicketScanService,
    gemini_service: GeminiTicketScanService,
    grok_service: GrokTicketScanService,
) -> ScanResponse:
    """Legacy OCR first; optional LLM boost only when confidence is low."""
    t0 = time.perf_counter()
    legacy_result = legacy_service.scan_image(image_bytes, scan_metadata)
    legacy_ms = (time.perf_counter() - t0) * 1000.0

    if not _legacy_needs_llm_boost(legacy_result):
        logger.info(
            "Legacy-first: skipping %s (tickets=%s confidences=%s legacy_ms=%s)",
            engine,
            legacy_result.ticketCount,
            [round(float(t.confidence or 0.0), 3) for t in (legacy_result.tickets or [])],
            int(round(legacy_ms)),
        )
        return _annotate_ops(legacy_result, "legacy")

    # Avoid a second YOLO + collage round-trip when cloud credentials are missing.
    if engine == "groq" and not (settings.GROQ_API_KEY or "").strip():
        return _keep_legacy_result(
            legacy_result,
            "GROQ_API_KEY chưa cấu hình — giữ kết quả OCR local (bỏ qua boost).",
        )
    if engine == "gemini" and not (settings.GEMINI_API_KEY or "").strip():
        return _keep_legacy_result(
            legacy_result,
            "GEMINI_API_KEY chưa cấu hình — giữ kết quả OCR local (bỏ qua boost).",
        )
    if engine == "grok" and not (settings.GROK_API_KEY or "").strip():
        return _keep_legacy_result(
            legacy_result,
            "GROK_API_KEY chưa cấu hình — giữ kết quả OCR local (bỏ qua boost).",
        )

    logger.info(
        "Legacy-first: boosting with %s (tickets=%s statuses=%s legacy_ms=%s)",
        engine,
        legacy_result.ticketCount,
        [
            (t.status.value if isinstance(t.status, TicketStatus) else t.status)
            for t in (legacy_result.tickets or [])
        ],
        int(round(legacy_ms)),
    )

    circuit = llm_circuit.snapshot()
    if circuit.open:
        return _keep_legacy_result(
            legacy_result,
            (
                f"AI cloud tạm nghỉ sau khi hết hạn mức "
                f"(còn ~{circuit.remainingSeconds}s). Giữ kết quả OCR local."
            ),
        )

    quota = llm_quota.try_consume()
    if quota.exhausted:
        logger.warning(
            "LLM daily quota exhausted (%s/%s on %s); keeping legacy OCR",
            quota.used,
            quota.limit,
            quota.date,
        )
        return _keep_legacy_result(
            legacy_result,
            (
                f"Đã hết hạn mức quét AI trong ngày ({quota.used}/{quota.limit}). "
                "Giữ kết quả OCR local."
            ),
        )

    try:
        t1 = time.perf_counter()
        from infra.groq_client import fail_fast_rate_limits  # noqa: PLC0415

        boost_fail_fast = bool(
            getattr(settings, "TICKET_VISION_GROQ_BOOST_FAIL_FAST", True)
        )
        with fail_fast_rate_limits(boost_fail_fast):
            llm_result = _run_engine_scan(
                engine=engine,
                image_bytes=image_bytes,
                scan_metadata=scan_metadata,
                legacy_service=legacy_service,
                groq_service=groq_service,
                gemini_service=gemini_service,
                grok_service=grok_service,
            )
        llm_ms = (time.perf_counter() - t1) * 1000.0
        if _llm_result_is_usable(llm_result):
            logger.info(
                "Legacy-first: using %s result (tickets=%s llm_ms=%s)",
                engine,
                llm_result.ticketCount,
                int(round(llm_ms)),
            )
            legacy_result = _retry_missing_template_serials(
                legacy_result, llm_result, image_bytes, scan_metadata, legacy_service
            )
            merged = _merge_boost_with_legacy(legacy_result, llm_result)
            return _annotate_ops(merged, engine)
        return _keep_legacy_result(
            legacy_result,
            f"{engine} không đọc được nội dung vé; giữ kết quả OCR local.",
        )
    except (ImageTooLargeError, InvalidImageError) as exc:
        logger.warning("Invalid ticket image upload during LLM boost: %s", exc)
        return _soft_unreadable_scan_response(
            "Ảnh không hợp lệ hoặc quá lớn. Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
        )
    except VisionConfigurationError as exc:
        logger.error("%s ticket scan misconfigured during boost: %s", engine, exc)
        return _keep_legacy_result(
            legacy_result,
            f"Cấu hình AI ({engine}) chưa sẵn sàng; giữ kết quả OCR local.",
        )
    except VisionClientError as exc:
        provider_message = _user_message_for_vision_error(exc)
        status = getattr(exc, "status_code", None)
        detail = str(exc)
        # TPD → long circuit. ITPM/TPM already soft-tripped in groq_client
        # (fail-fast); do not extend to a 15-minute blackout.
        if llm_circuit.looks_like_quota_exhaustion(detail):
            llm_circuit.trip(detail[:200] or provider_message)
        logger.warning(
            "Legacy-first: %s failed (%s); keeping legacy OCR",
            engine,
            provider_message,
        )
        return _keep_legacy_result(legacy_result, provider_message)
    except Exception:  # noqa: BLE001
        logger.exception(
            "Legacy-first: unexpected %s failure; keeping legacy OCR",
            engine,
        )
        return _keep_legacy_result(
            legacy_result,
            f"AI ({engine}) gặp lỗi; giữ kết quả OCR local.",
        )


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
    # Explicit local-only, or cloud engine with legacy-first hybrid.
    if engine == "legacy":
        try:
            result = legacy_service.scan_image(image_bytes, scan_metadata)
            return _annotate_ops(result, "legacy")
        except (ImageTooLargeError, InvalidImageError):
            return _soft_unreadable_scan_response(
                "Ảnh không hợp lệ hoặc quá lớn. Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
            )
        except Exception:  # noqa: BLE001
            logger.exception("Legacy-only scan failed — soft unreadable")
            return _soft_unreadable_scan_response(
                "Không thể đọc rõ thông tin vé từ ảnh này. "
                "Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
            )

    if engine in _LLM_ENGINES and (
        _legacy_first_enabled() or _has_serial_template(scan_metadata)
    ):
        try:
            return _scan_legacy_first(
                engine=engine,
                image_bytes=image_bytes,
                scan_metadata=scan_metadata,
                legacy_service=legacy_service,
                groq_service=groq_service,
                gemini_service=gemini_service,
                grok_service=grok_service,
            )
        except (ImageTooLargeError, InvalidImageError):
            return _soft_unreadable_scan_response(
                "Ảnh không hợp lệ hoặc quá lớn. Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
            )
        except Exception:  # noqa: BLE001
            logger.exception("Legacy-first scan failed — soft unreadable")
            return _soft_unreadable_scan_response(
                "Không thể đọc rõ thông tin vé từ ảnh này. "
                "Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
            )

    # Rollback path: LLM first, then legacy on failure (LEGACY_FIRST=false).
    engine_used = engine
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
        if _should_fallback_to_legacy(engine) and not _llm_result_is_usable(result):
            try:
                legacy_result = _fallback_to_legacy(
                    engine=engine,
                    image_bytes=image_bytes,
                    scan_metadata=scan_metadata,
                    legacy_service=legacy_service,
                    reason=(
                        "không nhận diện được nội dung vé qua AI"
                        if (result.tickets or result.ticketCount)
                        else "không nhận diện được vé qua AI"
                    ),
                )
                if _llm_result_is_usable(legacy_result) or legacy_result.tickets:
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
    t_route = time.perf_counter()

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

    route_ms = (time.perf_counter() - t_route) * 1000.0
    logger.info(
        "OCR /scan route timings ms: wall=%.0f engine=%s bytes=%s tickets=%s warnings=%s",
        route_ms,
        getattr(result, "recognitionEngineUsed", None) or engine,
        len(image_bytes),
        getattr(result, "ticketCount", 0),
        len(getattr(result, "warnings", None) or []),
    )

    message = "Quét vé thành công."
    if result.warnings:
        message = result.warnings[0]
    elif result.ticketCount == 0:
        message = "Không nhận diện được vé từ ảnh này."
    return APIResponse.ok(data=result.model_dump(), message=message)
