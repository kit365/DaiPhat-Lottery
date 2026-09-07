"""Provider-agnostic LLM vision ticket scan (Groq / Gemini / Grok / future models)."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime
from typing import Protocol

import numpy as np

from domain.enums.ticket_status import REQUIRED_FIELDS
from domain.preprocessing import pipeline as image_pipeline
from domain.scanning.status_resolver import resolve_status
from domain.scanning.yolo_llm_guidance import (
    build_yolo_llm_guidance,
    limit_vision_extra_images,
    merge_yolo_and_template_guidance,
)
from domain.stations.default_aliases import DEFAULT_STATIONS
from domain.stations.matcher import StationMatcher
from domain.stations.models import StationRef
from domain.validation.format_validator import FormatValidator
from dto.request.scan_metadata import ScanMetadata
from dto.response.scan_response import (
    BoundingBox,
    ExtractedTicketFields,
    ScanResponse,
    TicketScanResult,
)
from infra.logger import logger
from infra.vision_extraction import (
    TicketBBox,
    TicketExtraction,
    build_ticket_extraction_prompt,
    format_price_vnd,
)

_UNCERTAIN_FIELD_CONFIDENCE = 0.5
_SUPPORTED_ENGINES = frozenset({"groq", "gemini", "grok", "legacy"})
# Optional OCR fields reported in fieldConfidences but not required for COMPLETE.
_OPTIONAL_CONFIDENCE_FIELDS: tuple[str, ...] = ("ticketType", "batchCode")


class VisionClientProtocol(Protocol):
    def analyze_ticket_image(
        self,
        image_bytes: bytes,
        prompt: str,
        *,
        extra_images: list[tuple[str, bytes]] | None = None,
    ): ...


def _normalized_to_pixel_bbox(
    *,
    x: float,
    y: float,
    width: float,
    height: float,
    image_width: int,
    image_height: int,
) -> BoundingBox | None:
    if width <= 0 or height <= 0 or image_width <= 0 or image_height <= 0:
        return None
    px = int(round(max(0.0, min(1.0, x)) * image_width))
    py = int(round(max(0.0, min(1.0, y)) * image_height))
    pw = int(round(max(0.0, min(1.0, width)) * image_width))
    ph = int(round(max(0.0, min(1.0, height)) * image_height))
    return _clamp_bbox(
        TicketBBox(x=px, y=py, width=max(1, pw), height=max(1, ph)),
        image_width,
        image_height,
    )


def _build_layout_guidance(
    metadata: ScanMetadata,
    image: np.ndarray,
    image_width: int,
    image_height: int,
) -> tuple[str | None, list[tuple[str, bytes]], list]:
    """Convert normalized layouts → pixel ROI hint + JPEG crops for vision.

    Returns (hint_text, crops, ordered_layouts) where ordered_layouts are sorted
    by (fieldName, priority) for priority fallback.
    """
    layouts = list(metadata.fieldLayouts or [])
    if not layouts:
        return None, [], []

    layouts_sorted = sorted(
        layouts,
        key=lambda layout: (layout.fieldName or "", int(layout.priority or 1), layout.id or 0),
    )

    hint_lines: list[str] = []
    crops: list[tuple[str, bytes]] = []
    for layout in layouts_sorted:
        box = _normalized_to_pixel_bbox(
            x=layout.x,
            y=layout.y,
            width=layout.width,
            height=layout.height,
            image_width=image_width,
            image_height=image_height,
        )
        if box is None:
            continue
        required = "required" if layout.required else "optional"
        priority = int(layout.priority or 1)
        layout_id = layout.id
        id_part = f"id={layout_id}" if layout_id is not None else "id=unknown"
        hint_lines.append(
            f"- {layout.fieldName} priority={priority} ({id_part}, {required}): "
            f"x={box.x}, y={box.y}, w={box.width}, h={box.height}"
        )
        try:
            crop = _crop_image(image, box)
            if crop.size == 0:
                continue
            crop_bytes = image_pipeline.encode_to_jpeg_bytes(crop)
            label = f"field-crop:{layout.fieldName}:p{priority}"
            if layout_id is not None:
                label = f"{label}:id{layout_id}"
            crops.append((label, crop_bytes))
        except Exception:  # noqa: BLE001
            logger.exception("Failed to crop template field %s", layout.fieldName)

    if not hint_lines:
        return None, [], layouts_sorted
    return "\n".join(hint_lines), crops, layouts_sorted


def _group_layouts_by_field(layouts: list) -> dict[str, list]:
    grouped: dict[str, list] = {}
    for layout in layouts:
        name = (layout.fieldName or "").strip()
        if not name:
            continue
        grouped.setdefault(name, []).append(layout)
    for name in grouped:
        grouped[name] = sorted(
            grouped[name],
            key=lambda item: (int(item.priority or 1), item.id or 0),
        )
    return grouped


def _iou(a: BoundingBox, b: BoundingBox) -> float:
    ax2, ay2 = a.x + a.width, a.y + a.height
    bx2, by2 = b.x + b.width, b.y + b.height
    ix1, iy1 = max(a.x, b.x), max(a.y, b.y)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    union = a.width * a.height + b.width * b.height - inter
    return float(inter) / float(union) if union > 0 else 0.0


def _infer_used_layout_id(
    field_name: str,
    field_box: BoundingBox | None,
    layouts_for_field: list,
    image_width: int,
    image_height: int,
    preferred_id: int | None = None,
) -> int | None:
    if preferred_id is not None:
        for layout in layouts_for_field:
            if layout.id == preferred_id:
                return preferred_id
    if not layouts_for_field:
        return None
    if field_box is None:
        primary = layouts_for_field[0]
        return primary.id if primary.id is not None else None

    best_id = None
    best_iou = 0.0
    for layout in layouts_for_field:
        pixel = _normalized_to_pixel_bbox(
            x=layout.x,
            y=layout.y,
            width=layout.width,
            height=layout.height,
            image_width=image_width,
            image_height=image_height,
        )
        if pixel is None:
            continue
        score = _iou(field_box, pixel)
        if score > best_iou:
            best_iou = score
            best_id = layout.id
    if best_id is not None and best_iou >= 0.05:
        return best_id
    primary = layouts_for_field[0]
    return primary.id if primary.id is not None else None


def _extracted_value_for_field(extracted: ExtractedTicketFields, field_name: str) -> str | None:
    return getattr(extracted, field_name, None) if hasattr(extracted, field_name) else None


def resolve_recognition_engine(metadata: ScanMetadata, default_engine: str) -> str:
    raw = (metadata.recognitionEngine or default_engine or "groq").strip().lower()
    if raw in _SUPPORTED_ENGINES:
        return raw
    fallback = (default_engine or "groq").strip().lower()
    return fallback if fallback in _SUPPORTED_ENGINES else "groq"


def _normalize_numbers(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    return digits or None


def _normalize_serial(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = re.sub(r"\s+", "", raw.strip())
    return cleaned or None


def _normalize_batch_code(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = re.sub(r"\s+", "", raw.strip())
    return cleaned or None


def _normalize_draw_date(raw: str | None) -> str | None:
    """Return ISO YYYY-MM-DD or None. Never pass non-ISO strings downstream."""
    if not raw:
        return None
    text = raw.strip()
    if not text:
        return None
    try:
        datetime.strptime(text, "%Y-%m-%d")
        return text
    except ValueError:
        pass
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _clamp_confidence(value: float | None) -> float:
    if value is None:
        return 0.0
    return max(0.0, min(1.0, float(value)))


def _field_confidences(
    ticket: TicketExtraction,
    extracted: ExtractedTicketFields,
) -> dict[str, float]:
    raw = ticket.fieldConfidences or {}
    result: dict[str, float] = {}
    for field in (*REQUIRED_FIELDS, *_OPTIONAL_CONFIDENCE_FIELDS):
        value = raw.get(field)
        if value is not None:
            result[field] = _clamp_confidence(value)
        elif getattr(extracted, field, None):
            result[field] = _UNCERTAIN_FIELD_CONFIDENCE
        else:
            result[field] = 0.0
    return result


def _clamp_bbox(
    bbox: TicketBBox | None,
    image_width: int,
    image_height: int,
) -> BoundingBox | None:
    if not bbox or bbox.width <= 0 or bbox.height <= 0:
        return None
    x = max(0, min(bbox.x, image_width - 1))
    y = max(0, min(bbox.y, image_height - 1))
    w = max(1, min(bbox.width, image_width - x))
    h = max(1, min(bbox.height, image_height - y))
    corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    return BoundingBox(x=x, y=y, width=w, height=h, corners=corners)


def _resolve_field_boxes(
    raw_boxes: dict[str, TicketBBox] | None,
    image_width: int,
    image_height: int,
) -> dict[str, BoundingBox]:
    result: dict[str, BoundingBox] = {}
    if not raw_boxes:
        return result
    for name, box in raw_boxes.items():
        clamped = _clamp_bbox(box, image_width, image_height)
        if clamped is not None:
            result[name] = clamped
    return result


def _resolve_bbox(
    bbox: TicketBBox | None,
    image_width: int,
    image_height: int,
    ticket_index: int,
    total_tickets: int,
) -> BoundingBox:
    if bbox and bbox.width > 0 and bbox.height > 0:
        x = max(0, min(bbox.x, image_width - 1))
        y = max(0, min(bbox.y, image_height - 1))
        w = max(1, min(bbox.width, image_width - x))
        h = max(1, min(bbox.height, image_height - y))
    elif total_tickets == 1:
        x, y, w, h = 0, 0, image_width, image_height
    else:
        band_h = max(1, image_height // max(total_tickets, 1))
        y = min(ticket_index * band_h, image_height - 1)
        x, w, h = 0, image_width, min(band_h, image_height - y)

    corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    return BoundingBox(x=x, y=y, width=w, height=h, corners=corners)


def _crop_image(image: np.ndarray, bbox: BoundingBox) -> np.ndarray:
    h, w = image.shape[:2]
    x1 = max(0, min(bbox.x, w - 1))
    y1 = max(0, min(bbox.y, h - 1))
    x2 = max(x1 + 1, min(bbox.x + bbox.width, w))
    y2 = max(y1 + 1, min(bbox.y + bbox.height, h))
    return image[y1:y2, x1:x2]


class LlmTicketScanService:
    """Scan tickets via a vision LLM client; Layer-1 validation matches legacy path."""

    def __init__(
        self,
        vision_client: VisionClientProtocol,
        *,
        provider_label: str = "LLM",
        validator: FormatValidator | None = None,
        max_file_size_mb: int = 5,
        max_image_dimension: int = 1920,
        max_tickets_per_image: int = 15,
        station_fuzzy_threshold: int = 80,
        high_confidence_threshold: float = 0.85,
        low_confidence_threshold: float = 0.70,
        include_cropped_image: bool = True,
    ) -> None:
        self._vision_client = vision_client
        self._provider_label = provider_label
        self._validator = validator or FormatValidator()
        self._max_file_size_mb = max_file_size_mb
        self._max_image_dimension = max_image_dimension
        self._max_tickets_per_image = max_tickets_per_image
        self._station_fuzzy_threshold = station_fuzzy_threshold
        self._high_confidence_threshold = high_confidence_threshold
        self._low_confidence_threshold = low_confidence_threshold
        self._include_cropped_image = include_cropped_image

    def scan_image(self, image_bytes: bytes, metadata: ScanMetadata) -> ScanResponse:
        image_pipeline.guard_file_size(image_bytes, self._max_file_size_mb)
        image = image_pipeline.decode_image(image_bytes)
        image = image_pipeline.resize_if_needed(image, self._max_image_dimension)
        image_height, image_width = image.shape[:2]
        # Send the same resized JPEG Gemini annotates so bbox coords match crops.
        vision_image_bytes = image_pipeline.encode_to_jpeg_bytes(image)

        max_tickets = metadata.maxTickets or self._max_tickets_per_image
        max_tickets = min(max_tickets, self._max_tickets_per_image)

        stations = [
            StationRef(id=s.id, name=s.name, code=s.code, aliases=tuple(s.aliases))
            for s in metadata.activeStations
        ] or list(DEFAULT_STATIONS)
        station_matcher = StationMatcher(stations)

        expected_lengths_by_code = {
            s.code: s.expectedNumberLength
            for s in metadata.activeStations
            if s.code and s.expectedNumberLength
        }

        stations_payload = [
            {
                "name": s.name,
                "code": s.code,
                "aliases": s.aliases,
                "expectedNumberLength": s.expectedNumberLength,
            }
            for s in metadata.activeStations
        ]
        # YOLO (best.pt) → Template/Layout fills gaps (Rule A) → Groq crops.
        yolo_guidance = build_yolo_llm_guidance(image, max_tickets=max_tickets)
        layout_hint, layout_crops, ordered_layouts = _build_layout_guidance(
            metadata, image, image_width, image_height
        )
        if layout_crops:
            logger.info(
                "Template-guided OCR: templateId=%s layout_fields=%s crops=%s",
                metadata.templateId,
                len(metadata.fieldLayouts or []),
                len(layout_crops),
            )
        merged_hint, merged_crops = merge_yolo_and_template_guidance(
            yolo_guidance,
            layout_hint,
            layout_crops,
        )
        merged_crops = limit_vision_extra_images(merged_crops)
        prompt = build_ticket_extraction_prompt(
            json.dumps(stations_payload, ensure_ascii=False),
            max_tickets,
            image_width,
            image_height,
            field_layouts_hint=merged_hint,
        )
        extraction = self._vision_client.analyze_ticket_image(
            vision_image_bytes,
            prompt,
            extra_images=merged_crops or None,
        )

        # One bundled retry for weak fields using alternate priority crops.
        extraction = self._retry_weak_fields_with_alternate_layouts(
            extraction=extraction,
            metadata=metadata,
            ordered_layouts=ordered_layouts,
            image=image,
            image_width=image_width,
            image_height=image_height,
            stations_payload=stations_payload,
            max_tickets=max_tickets,
        )

        warnings = list(extraction.warnings)
        if len(extraction.tickets) > max_tickets:
            warnings.append(
                f"{self._provider_label} trả về {len(extraction.tickets)} vé; "
                f"chỉ xử lý {max_tickets} vé đầu."
            )

        tickets: list[TicketScanResult] = []
        llm_tickets = extraction.tickets[:max_tickets]

        for index, llm_ticket in enumerate(llm_tickets):
            try:
                tickets.append(
                    self._map_ticket(
                        llm_ticket,
                        index,
                        image,
                        image_width,
                        image_height,
                        len(llm_tickets),
                        station_matcher,
                        expected_lengths_by_code,
                        ordered_layouts,
                    )
                )
            except Exception:  # noqa: BLE001
                logger.exception(
                    "Failed to map %s ticket #%s", self._provider_label, index
                )
                warnings.append(f"Vé #{index}: xử lý thất bại, đã bỏ qua.")

        if not tickets and not warnings:
            warnings.append(
                f"{self._provider_label} không phát hiện vé nào trong ảnh."
            )

        return ScanResponse(
            scanId=str(uuid.uuid4()),
            ticketCount=len(tickets),
            tickets=tickets,
            warnings=warnings,
            imageWidth=image_width,
            imageHeight=image_height,
        )

    def _retry_weak_fields_with_alternate_layouts(
        self,
        *,
        extraction,
        metadata: ScanMetadata,
        ordered_layouts: list,
        image: np.ndarray,
        image_width: int,
        image_height: int,
        stations_payload: list,
        max_tickets: int,
    ):
        """If primary region confidence is low, try the next priority crop(s) once."""
        if not ordered_layouts or not extraction.tickets:
            return extraction

        by_field = _group_layouts_by_field(ordered_layouts)
        retry_crops: list[tuple[str, bytes]] = []
        weak_fields: set[str] = set()

        for ticket in extraction.tickets:
            confidences = ticket.fieldConfidences or {}
            used = dict(ticket.usedFieldLayouts or {})
            for field_name, layouts in by_field.items():
                if len(layouts) < 2:
                    continue
                value = getattr(ticket, field_name, None)
                conf = _clamp_confidence(confidences.get(field_name))
                if value and conf >= self._low_confidence_threshold:
                    continue
                used_id = used.get(field_name)
                next_layout = None
                passed_used = used_id is None
                for layout in layouts:
                    if used_id is not None:
                        if layout.id == used_id:
                            passed_used = True
                            continue
                        if not passed_used:
                            continue
                        next_layout = layout
                        break
                    # First pass already covered primary (priority 1); try next.
                    if int(layout.priority or 1) <= 1:
                        continue
                    next_layout = layout
                    break
                if next_layout is None:
                    continue
                layout = next_layout
                box = _normalized_to_pixel_bbox(
                    x=layout.x,
                    y=layout.y,
                    width=layout.width,
                    height=layout.height,
                    image_width=image_width,
                    image_height=image_height,
                )
                if box is None:
                    continue
                try:
                    crop = _crop_image(image, box)
                    if crop.size == 0:
                        continue
                    crop_bytes = image_pipeline.encode_to_jpeg_bytes(crop)
                    label = (
                        f"retry-field-crop:{field_name}:p{int(layout.priority or 1)}"
                        f":id{layout.id}"
                    )
                    retry_crops.append((label, crop_bytes))
                    weak_fields.add(field_name)
                except Exception:  # noqa: BLE001
                    logger.exception("Retry crop failed for %s", field_name)

        if not retry_crops or not weak_fields:
            return extraction

        retry_prompt = (
            build_ticket_extraction_prompt(
                json.dumps(stations_payload, ensure_ascii=False),
                max_tickets,
                image_width,
                image_height,
                field_layouts_hint=(
                    "Retry pass: re-read ONLY these weak fields from the provided "
                    f"alternate-priority crops: {sorted(weak_fields)}. "
                    "Keep other fields unchanged if already reliable. "
                    "Update usedFieldLayouts to the layout id of the crop that worked."
                ),
            )
        )
        try:
            # Reuse full image + only alternate crops so model can compare.
            vision_image_bytes = image_pipeline.encode_to_jpeg_bytes(image)
            retry = self._vision_client.analyze_ticket_image(
                vision_image_bytes,
                retry_prompt,
                extra_images=limit_vision_extra_images(retry_crops) or None,
            )
        except Exception:  # noqa: BLE001
            logger.exception("Alternate-layout OCR retry failed; keeping first pass")
            return extraction

        if not retry.tickets:
            return extraction

        # Merge better field values ticket-by-ticket.
        for index, original in enumerate(extraction.tickets):
            if index >= len(retry.tickets):
                break
            alt = retry.tickets[index]
            alt_conf = alt.fieldConfidences or {}
            orig_conf = dict(original.fieldConfidences or {})
            used = dict(original.usedFieldLayouts or {})
            alt_used = alt.usedFieldLayouts or {}
            for field_name in weak_fields:
                alt_value = getattr(alt, field_name, None)
                alt_c = _clamp_confidence(alt_conf.get(field_name))
                orig_c = _clamp_confidence(orig_conf.get(field_name))
                orig_value = getattr(original, field_name, None)
                if not alt_value:
                    continue
                if (not orig_value) or alt_c > orig_c:
                    setattr(original, field_name, alt_value)
                    orig_conf[field_name] = alt_c
                    if field_name in (alt.fieldBoxes or {}):
                        original.fieldBoxes[field_name] = alt.fieldBoxes[field_name]
                    if field_name in alt_used:
                        used[field_name] = alt_used[field_name]
            original.fieldConfidences = orig_conf
            original.usedFieldLayouts = used

        return extraction

    def _map_ticket(
        self,
        llm_ticket: TicketExtraction,
        index: int,
        image: np.ndarray,
        image_width: int,
        image_height: int,
        total_tickets: int,
        station_matcher: StationMatcher,
        expected_lengths_by_code: dict[str, int | None],
        ordered_layouts: list | None = None,
    ) -> TicketScanResult:
        station_name = llm_ticket.stationName.strip() if llm_ticket.stationName else None
        station_code = llm_ticket.stationCode.strip() if llm_ticket.stationCode else None
        match_result = None

        if station_name:
            match_result = station_matcher.match(station_name, self._station_fuzzy_threshold)
            if match_result.station:
                station_name = match_result.station.name
                station_code = match_result.station.code or station_code
            elif match_result.score > 0:
                logger.debug(
                    "%s station '%s' below fuzzy threshold (score=%.2f)",
                    self._provider_label,
                    station_name,
                    match_result.score,
                )

        extracted = ExtractedTicketFields(
            stationName=station_name,
            stationCode=station_code,
            serialNumber=_normalize_serial(llm_ticket.serialNumber),
            numbers=_normalize_numbers(llm_ticket.numbers),
            drawDate=_normalize_draw_date(llm_ticket.drawDate),
            ticketType=format_price_vnd(llm_ticket.ticketType),
            batchCode=_normalize_batch_code(llm_ticket.batchCode),
        )

        field_confidences = _field_confidences(llm_ticket, extracted)

        if match_result and station_name and not match_result.station:
            field_confidences["stationName"] = min(
                field_confidences.get("stationName", _UNCERTAIN_FIELD_CONFIDENCE),
                match_result.score if match_result.score > 0 else _UNCERTAIN_FIELD_CONFIDENCE,
            )

        expected_length = (
            expected_lengths_by_code.get(extracted.stationCode)
            if extracted.stationCode
            else None
        )
        validation = self._validator.validate(extracted, expected_number_length=expected_length)
        status, confidence = resolve_status(
            field_confidences,
            validation,
            self._high_confidence_threshold,
            self._low_confidence_threshold,
        )

        bbox = _resolve_bbox(llm_ticket.bbox, image_width, image_height, index, total_tickets)
        field_boxes = _resolve_field_boxes(llm_ticket.fieldBoxes, image_width, image_height)

        used_field_layouts: dict[str, int] = {}
        raw_used = dict(llm_ticket.usedFieldLayouts or {})
        by_field = _group_layouts_by_field(ordered_layouts or [])
        for field_name in list(REQUIRED_FIELDS) + list(_OPTIONAL_CONFIDENCE_FIELDS):
            value = _extracted_value_for_field(extracted, field_name)
            if not value:
                continue
            preferred = raw_used.get(field_name)
            preferred_int = int(preferred) if preferred is not None else None
            inferred = _infer_used_layout_id(
                field_name,
                field_boxes.get(field_name),
                by_field.get(field_name, []),
                image_width,
                image_height,
                preferred_id=preferred_int,
            )
            if inferred is not None:
                used_field_layouts[field_name] = inferred

        cropped_image_base64 = None
        if self._include_cropped_image:
            crop = _crop_image(image, bbox)
            if crop.size > 0:
                cropped_image_base64 = image_pipeline.encode_to_base64_jpeg(crop)

        return TicketScanResult(
            ticketIndex=index,
            bbox=bbox,
            status=status,
            confidence=confidence,
            extracted=extracted,
            fieldConfidences=field_confidences,
            fieldBoxes=field_boxes,
            usedFieldLayouts=used_field_layouts,
            missingFields=validation.missing_fields,
            validationErrors=validation.errors,
            croppedImageBase64=cropped_image_base64,
            imageWidth=image_width,
            imageHeight=image_height,
        )
