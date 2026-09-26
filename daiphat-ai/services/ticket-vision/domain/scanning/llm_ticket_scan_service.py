"""Provider-agnostic LLM vision ticket scan (Groq / Gemini / Grok / future models)."""

from __future__ import annotations

import json
import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Protocol

import cv2
import numpy as np

from domain.enums.ticket_status import REQUIRED_FIELDS
from domain.preprocessing import pipeline as image_pipeline
from domain.scanning.status_resolver import resolve_status
from domain.scanning.yolo_llm_guidance import (
    _crop_looks_like_ticket,
    build_yolo_llm_guidance,
    limit_vision_extra_images,
    merge_yolo_and_template_guidance,
)
from domain.stations.default_aliases import DEFAULT_STATIONS
from domain.stations.matcher import StationMatcher
from domain.stations.models import StationRef
from domain.validation.format_validator import FormatValidator, reconcile_serial_and_batch_code
from dto.request.scan_metadata import ScanMetadata
from dto.response.scan_response import (
    BoundingBox,
    ExtractedTicketFields,
    ScanResponse,
    TicketScanResult,
)
from infra.config import settings
from infra.logger import logger
from infra.vision_extraction import (
    TicketBBox,
    TicketExtraction,
    ScanExtractionResult,
    VisionApiError,
    VisionClientError,
    build_ticket_extraction_prompt,
    format_price_vnd,
    localize_scan_warnings,
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
    *,
    crop_source: np.ndarray | None = None,
    crop_scale_x: float = 1.0,
    crop_scale_y: float = 1.0,
) -> tuple[str | None, list[tuple[str, bytes]], list]:
    """Convert normalized layouts → pixel ROI hint + high-quality JPEG crops for vision.

    Hint coordinates stay in ``image`` space (the frame sent as the main vision
    image). Crop bytes are taken from ``crop_source`` when provided so OCR sees
    full-resolution ticket pixels (crop only — no enhance).
    """
    layouts = list(metadata.fieldLayouts or [])
    if not layouts:
        return None, [], []

    layouts_sorted = sorted(
        layouts,
        key=lambda layout: (layout.fieldName or "", int(layout.priority or 1), layout.id or 0),
    )

    source = crop_source if crop_source is not None else image
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
            crop_box = (
                _scale_bbox(box, crop_scale_x, crop_scale_y)
                if crop_source is not None
                and (abs(crop_scale_x - 1.0) > 1e-6 or abs(crop_scale_y - 1.0) > 1e-6)
                else box
            )
            crop = _crop_image(source, crop_box)
            if crop.size == 0:
                continue
            # High-quality JPEG for the vision API only — no geometry shrink.
            crop_bytes = image_pipeline.encode_to_jpeg_bytes_bounded(
                crop,
                max_bytes=2_500_000,
                quality_start=98,
                quality_floor=95,
                allow_geometry_shrink=False,
            )
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
    """Keep OCR digits as-is. Never pad/truncate to force length 6."""
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


def _looks_normalized(bbox: TicketBBox) -> bool:
    """True when the model returned unit-square fractions of the full frame."""
    if bbox.width <= 0 or bbox.height <= 0:
        return False
    return (
        0.0 <= float(bbox.x) <= 1.0
        and 0.0 <= float(bbox.y) <= 1.0
        and 0.0 < float(bbox.width) <= 1.0
        and 0.0 < float(bbox.height) <= 1.0
        and float(bbox.x) + float(bbox.width) <= 1.01
        and float(bbox.y) + float(bbox.height) <= 1.01
    )


def _to_pixel_ticket_bbox(
    bbox: TicketBBox | None,
    image_width: int,
    image_height: int,
) -> TicketBBox | None:
    """Accept normalized 0..1 or absolute pixel boxes from the vision model."""
    if not bbox or bbox.width <= 0 or bbox.height <= 0:
        return None
    if _looks_normalized(bbox):
        return TicketBBox(
            x=float(bbox.x) * image_width,
            y=float(bbox.y) * image_height,
            width=float(bbox.width) * image_width,
            height=float(bbox.height) * image_height,
        )
    return bbox


def _bbox_area(box: BoundingBox) -> int:
    return max(0, box.width) * max(0, box.height)


def _clamp_bbox(
    bbox: TicketBBox | None,
    image_width: int,
    image_height: int,
) -> BoundingBox | None:
    pixel = _to_pixel_ticket_bbox(bbox, image_width, image_height)
    if not pixel or pixel.width <= 0 or pixel.height <= 0:
        return None
    x = max(0, min(int(round(pixel.x)), image_width - 1))
    y = max(0, min(int(round(pixel.y)), image_height - 1))
    w = max(1, min(int(round(pixel.width)), image_width - x))
    h = max(1, min(int(round(pixel.height)), image_height - y))
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


def _yolo_ticket_bbox(
    yolo_boxes: list[tuple[int, int, int, int]] | None,
    ticket_index: int,
    image_width: int,
    image_height: int,
) -> BoundingBox | None:
    if not yolo_boxes or ticket_index < 0 or ticket_index >= len(yolo_boxes):
        return None
    x, y, w, h = yolo_boxes[ticket_index]
    return _clamp_bbox(TicketBBox(x=x, y=y, width=w, height=h), image_width, image_height)


def _match_yolo_ticket_index(
    llm_box: BoundingBox | None,
    yolo_boxes: list[tuple[int, int, int, int]],
    used_indices: set[int],
    fallback_index: int,
) -> int | None:
    """Pick the unused YOLO ticket with best IoU vs the LLM box (not raw index)."""
    if not yolo_boxes:
        return None

    best_index: int | None = None
    best_iou = 0.12
    if llm_box is not None:
        for index, (x, y, w, h) in enumerate(yolo_boxes):
            if index in used_indices:
                continue
            candidate = BoundingBox(x=x, y=y, width=w, height=h, corners=[])
            score = _iou(llm_box, candidate)
            if score > best_iou:
                best_iou = score
                best_index = index

    if best_index is not None:
        return best_index

    # No spatial match — fall back to reading-order index among unused boxes.
    if fallback_index not in used_indices and 0 <= fallback_index < len(yolo_boxes):
        return fallback_index
    for index in range(len(yolo_boxes)):
        if index not in used_indices:
            return index
    return None


def _should_prefer_yolo_ticket(llm_box: BoundingBox, yolo_box: BoundingBox) -> bool:
    """Prefer YOLO when the LLM box is clearly undersized or oversized vs the detector."""
    llm_area = _bbox_area(llm_box)
    yolo_area = _bbox_area(yolo_box)
    if yolo_area <= 0:
        return False
    if llm_area <= 0:
        return True
    # LLM box covers less than 70% of YOLO area (misses ticket edges).
    if llm_area < yolo_area * 0.7:
        return True
    # LLM box is much larger than YOLO (includes table / neighboring stubs).
    if llm_area > yolo_area * 1.25:
        return True
    return _iou(llm_box, yolo_box) < 0.35 and yolo_area > llm_area


def _remap_field_boxes_to_ticket(
    field_boxes: dict[str, BoundingBox],
    source_ticket: BoundingBox,
    target_ticket: BoundingBox,
    image_width: int,
    image_height: int,
) -> dict[str, BoundingBox]:
    if (
        source_ticket.width <= 0
        or source_ticket.height <= 0
        or (
            source_ticket.x == target_ticket.x
            and source_ticket.y == target_ticket.y
            and source_ticket.width == target_ticket.width
            and source_ticket.height == target_ticket.height
        )
    ):
        return field_boxes

    sx = target_ticket.width / float(source_ticket.width)
    sy = target_ticket.height / float(source_ticket.height)
    remapped: dict[str, BoundingBox] = {}
    for name, box in field_boxes.items():
        x = target_ticket.x + (box.x - source_ticket.x) * sx
        y = target_ticket.y + (box.y - source_ticket.y) * sy
        w = box.width * sx
        h = box.height * sy
        clamped = _clamp_bbox(
            TicketBBox(x=x, y=y, width=w, height=h),
            image_width,
            image_height,
        )
        if clamped is not None:
            remapped[name] = clamped
    return remapped


def _remap_ticket_extraction_from_crop(
    ticket: TicketExtraction,
    *,
    offset_x: int,
    offset_y: int,
    crop_width: int,
    crop_height: int,
    full_width: int,
    full_height: int,
    fallback_box: BoundingBox,
) -> TicketExtraction:
    """Map crop-local bbox/fieldBoxes into full-frame pixel coordinates."""

    def _shift_box(box: TicketBBox | None) -> TicketBBox | None:
        if box is None or box.width <= 0 or box.height <= 0:
            return None
        # Normalized crop coords → full-frame pixels via crop size + offset.
        if _looks_normalized(box):
            x = offset_x + float(box.x) * crop_width
            y = offset_y + float(box.y) * crop_height
            w = float(box.width) * crop_width
            h = float(box.height) * crop_height
        else:
            x = offset_x + float(box.x)
            y = offset_y + float(box.y)
            w = float(box.width)
            h = float(box.height)
        clamped = _clamp_bbox(
            TicketBBox(x=x, y=y, width=w, height=h),
            full_width,
            full_height,
        )
        if clamped is None:
            return None
        return TicketBBox(
            x=float(clamped.x),
            y=float(clamped.y),
            width=float(clamped.width),
            height=float(clamped.height),
        )

    remapped_bbox = _shift_box(ticket.bbox)
    if remapped_bbox is None:
        remapped_bbox = TicketBBox(
            x=float(fallback_box.x),
            y=float(fallback_box.y),
            width=float(fallback_box.width),
            height=float(fallback_box.height),
        )

    remapped_fields: dict[str, TicketBBox] = {}
    for name, box in (ticket.fieldBoxes or {}).items():
        shifted = _shift_box(box)
        if shifted is not None:
            remapped_fields[name] = shifted

    return ticket.model_copy(
        update={
            "bbox": remapped_bbox,
            "fieldBoxes": remapped_fields,
        }
    )


def _resolve_bbox(
    bbox: TicketBBox | None,
    image_width: int,
    image_height: int,
    ticket_index: int,
    total_tickets: int,
    yolo_boxes: list[tuple[int, int, int, int]] | None = None,
    *,
    used_yolo_indices: set[int] | None = None,
) -> tuple[BoundingBox, BoundingBox | None, int | None]:
    """Return (final_ticket_bbox, llm_pixel_bbox_or_None, matched_yolo_index)."""
    llm_box = _clamp_bbox(bbox, image_width, image_height)
    used = used_yolo_indices if used_yolo_indices is not None else set()
    matched_index = _match_yolo_ticket_index(
        llm_box,
        yolo_boxes or [],
        used,
        fallback_index=ticket_index,
    )
    yolo_box = (
        _yolo_ticket_bbox(yolo_boxes, matched_index, image_width, image_height)
        if matched_index is not None
        else None
    )

    if yolo_box is not None:
        # Detector geometry is authoritative for Admin crop / multi-ticket layout.
        # LLM text may invent boxes on background; keep LLM box only as metadata.
        return yolo_box, llm_box, matched_index
    if llm_box:
        return llm_box, llm_box, matched_index

    if total_tickets == 1:
        x, y, w, h = 0, 0, image_width, image_height
    else:
        band_h = max(1, image_height // max(total_tickets, 1))
        y = min(ticket_index * band_h, image_height - 1)
        x, w, h = 0, image_width, min(band_h, image_height - y)

    corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    return BoundingBox(x=x, y=y, width=w, height=h, corners=corners), None, None


def _merge_yolo_field_boxes(
    field_boxes: dict[str, BoundingBox],
    yolo_fields: dict[str, tuple[int, int, int, int]] | None,
    image_width: int,
    image_height: int,
) -> dict[str, BoundingBox]:
    """YOLO field geometry wins when present; keep LLM boxes for gaps."""
    if not yolo_fields:
        return field_boxes
    merged = dict(field_boxes)
    for name, (x, y, w, h) in yolo_fields.items():
        clamped = _clamp_bbox(
            TicketBBox(x=x, y=y, width=w, height=h),
            image_width,
            image_height,
        )
        if clamped is not None:
            merged[name] = clamped
    return merged


def _crop_image(image: np.ndarray, bbox: BoundingBox) -> np.ndarray:
    """Crop a ticket/field region with outward padding; never re-trim into content."""
    h, w = image.shape[:2]
    x, y, bw, bh = image_pipeline.expand_bbox(
        bbox.x,
        bbox.y,
        bbox.width,
        bbox.height,
        w,
        h,
        pad_ratio=0.02,
    )
    x1 = max(0, min(x, w - 1))
    y1 = max(0, min(y, h - 1))
    x2 = max(x1 + 1, min(x + bw, w))
    y2 = max(y1 + 1, min(y + bh, h))
    return image[y1:y2, x1:x2]


def _scale_bbox(bbox: BoundingBox, scale_x: float, scale_y: float) -> BoundingBox:
    x = int(round(bbox.x * scale_x))
    y = int(round(bbox.y * scale_y))
    w = max(1, int(round(bbox.width * scale_x)))
    h = max(1, int(round(bbox.height * scale_y)))
    return BoundingBox(
        x=x,
        y=y,
        width=w,
        height=h,
        corners=[[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
    )


def _encode_preview_crop(crop: np.ndarray) -> str:
    """Admin ticket thumbnail: high-quality JPEG, capped resolution.

    Lossless full-res PNG of every ticket dominated multi-ticket scan latency
    (encode + base64 + BE re-upload). JPEG at ~1400px stays sharp in Admin.
    """
    if crop is None or crop.size == 0:
        return ""
    max_dim = int(getattr(settings, "TICKET_VISION_REVIEW_CROP_MAX_DIMENSION", 1400) or 1400)
    quality = int(getattr(settings, "TICKET_VISION_REVIEW_CROP_JPEG_QUALITY", 90) or 90)
    working = image_pipeline.resize_if_needed(crop, max_dim)
    return image_pipeline.encode_to_base64_jpeg(working, quality=quality)


def _field_boxes_full_to_crop_local(
    field_boxes: dict[str, BoundingBox],
    *,
    crop_x: int,
    crop_y: int,
    crop_w: int,
    crop_h: int,
    preview_w: int,
    preview_h: int,
) -> dict[str, BoundingBox]:
    """Map full-frame field boxes into cropped-preview pixel space."""
    if crop_w <= 0 or crop_h <= 0 or preview_w <= 0 or preview_h <= 0:
        return {}
    sx = preview_w / float(crop_w)
    sy = preview_h / float(crop_h)
    out: dict[str, BoundingBox] = {}
    for name, box in (field_boxes or {}).items():
        if box is None or box.width <= 0 or box.height <= 0:
            continue
        lx = int(round(box.x - crop_x))
        ly = int(round(box.y - crop_y))
        lw = int(round(box.width))
        lh = int(round(box.height))
        # Keep boxes that mostly sit inside this ticket crop.
        if lx + lw < 0 or ly + lh < 0 or lx > crop_w or ly > crop_h:
            continue
        lx = max(0, min(lx, crop_w - 1))
        ly = max(0, min(ly, crop_h - 1))
        lw = max(1, min(lw, crop_w - lx))
        lh = max(1, min(lh, crop_h - ly))
        nx = max(0, int(round(lx * sx)))
        ny = max(0, int(round(ly * sy)))
        nw = max(1, int(round(lw * sx)))
        nh = max(1, int(round(lh * sy)))
        if nx + nw > preview_w:
            nw = max(1, preview_w - nx)
        if ny + nh > preview_h:
            nh = max(1, preview_h - ny)
        out[name] = BoundingBox(
            x=nx,
            y=ny,
            width=nw,
            height=nh,
            corners=[[nx, ny], [nx + nw, ny], [nx + nw, ny + nh], [nx, ny + nh]],
        )
    return out


def _compact_stations_json(stations_payload: list, *, max_stations: int = 36) -> str:
    """Shorter station hint for Groq — aliases inflate prompt tokens a lot."""
    compact: list[dict] = []
    for s in stations_payload:
        if not isinstance(s, dict):
            continue
        entry: dict = {"name": s.get("name"), "code": s.get("code")}
        length = s.get("expectedNumberLength")
        if length:
            entry["expectedNumberLength"] = length
        compact.append(entry)
        if len(compact) >= max_stations:
            break
    return json.dumps(compact, ensure_ascii=False)


_JSON_TICKET_SCHEMA = (
    '{"tickets":[{"stationName":string|null,"stationCode":string|null,'
    '"serialNumber":string|null,"numbers":string|null,"drawDate":string|null,'
    '"ticketType":string|null,"batchCode":string|null,'
    '"fieldConfidences":{"stationName":number,"serialNumber":number,'
    '"numbers":number,"drawDate":number,"ticketType":number,"batchCode":number}}],'
    '"warnings":[string]}'
)


def _build_single_ticket_extraction_prompt(
    stations_json: str,
    crop_width: int,
    crop_height: int,
    *,
    extra_crop_hint: str | None = None,
) -> str:
    """Lean prompt for one YOLO ticket crop — values only."""
    extras = f"\n{extra_crop_hint}\n" if extra_crop_hint else "\n"
    return f"""Vietnamese lottery ticket OCR. One cropped ticket ({crop_width}x{crop_height}px).
Extract exactly 1 ticket. Only visible values — never invent.
Stations: {stations_json}
- numbers: digits only; use station expectedNumberLength when known; never pad/truncate.
- serialNumber: REQUIRED when printed. Shape = digits + exactly ONE letter at START or END
  (A123456, 123456B, X424944). NEVER lot/ký hiệu (4E2, 08D, T05K4, 5D2).
- batchCode: issuer ký hiệu/lô (4E2, 08D, T05K4) or null — NOT the serial.
- drawDate: YYYY-MM-DD or null.
- ticketType: price digits when visible.
- fieldConfidences 0..1. Omit bbox/fieldBoxes.
- If crop is background (wood/glass/no ticket): empty fields + warning "Ảnh mờ/bị che".
- warnings: short Vietnamese if covered/unreadable.
{extras}JSON only:
{_JSON_TICKET_SCHEMA}
"""


def _build_collage_extraction_prompt(
    stations_json: str,
    ticket_count: int,
    collage_width: int,
    collage_height: int,
    cell_lines: str,
) -> str:
    """Lean prompt for collage OCR — values only; geometry is YOLO-pinned."""
    return f"""Vietnamese lottery ticket OCR. COLLAGE MODE.
Labeled grid of {ticket_count} cropped tickets (#0..#{ticket_count - 1}).
Image {collage_width}x{collage_height}px. Return tickets[] length {ticket_count} in cell order.
Read only inside each cell. Only visible values — never invent.
Stations: {stations_json}
- numbers: digits only; use expectedNumberLength when known; never pad/truncate.
- serialNumber: digits + ONE letter at start OR end only (A123456 / 123456B). Never lot codes (4E2, 08D, T05K4).
- batchCode: issuer ký hiệu or null. ticketType: price digits. drawDate: YYYY-MM-DD or null.
- Empty/background cell: null fields + warning.
- fieldConfidences 0..1. Omit bbox/fieldBoxes.
- warnings: short Vietnamese if covered/unreadable.

Cells:
{cell_lines}

JSON only:
{_JSON_TICKET_SCHEMA}
"""


def _build_ticket_ocr_collage(
    crops: list[np.ndarray],
    *,
    cell_max_height: int = 480,
    columns: int = 2,
    label_height: int = 28,
) -> np.ndarray:
    """Pack ticket crops into one labeled grid for a single vision API call.

    Admin review still uses per-ticket PNG crops from YOLO boxes — this collage
    is OCR-only so multi-ticket scans pay one Groq round-trip instead of N.
    """
    if not crops:
        raise ValueError("collage requires at least one crop")

    cols = max(1, min(columns, len(crops)))
    cells: list[np.ndarray] = []
    cell_widths: list[int] = []
    cell_heights: list[int] = []

    for index, crop in enumerate(crops):
        working = crop
        h, w = working.shape[:2]
        if h > cell_max_height and h > 0:
            scale = cell_max_height / float(h)
            working = cv2.resize(
                working,
                (max(1, int(round(w * scale))), cell_max_height),
                interpolation=cv2.INTER_AREA,
            )
        ch, cw = working.shape[:2]
        label_bar = np.full((label_height, cw, 3), 32, dtype=np.uint8)
        cv2.putText(
            label_bar,
            f"#{index}",
            (6, label_height - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )
        cell = np.vstack([label_bar, working])
        cells.append(cell)
        cell_widths.append(int(cell.shape[1]))
        cell_heights.append(int(cell.shape[0]))

    rows = (len(cells) + cols - 1) // cols
    row_heights: list[int] = []
    col_widths = [0] * cols
    for row in range(rows):
        rh = 0
        for col in range(cols):
            idx = row * cols + col
            if idx >= len(cells):
                break
            rh = max(rh, cell_heights[idx])
            col_widths[col] = max(col_widths[col], cell_widths[idx])
        row_heights.append(rh)

    gap = 8
    canvas_w = sum(col_widths) + gap * (cols + 1)
    canvas_h = sum(row_heights) + gap * (rows + 1)
    canvas = np.full((canvas_h, canvas_w, 3), 245, dtype=np.uint8)

    y = gap
    for row in range(rows):
        x = gap
        for col in range(cols):
            idx = row * cols + col
            if idx >= len(cells):
                break
            cell = cells[idx]
            ch, cw = cell.shape[:2]
            # Pad cell into its grid slot so labels stay left-aligned.
            slot_w, slot_h = col_widths[col], row_heights[row]
            if cw != slot_w or ch != slot_h:
                padded = np.full((slot_h, slot_w, 3), 245, dtype=np.uint8)
                padded[0:ch, 0:cw] = cell
                cell = padded
            canvas[y : y + slot_h, x : x + slot_w] = cell
            x += slot_w + gap
        y += row_heights[row] + gap

    return canvas


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
        stage_ms: dict[str, float] = {}
        t_all = time.perf_counter()

        t0 = time.perf_counter()
        image_pipeline.guard_file_size(image_bytes, self._max_file_size_mb)
        image = image_pipeline.decode_image(image_bytes)
        stage_ms["decode"] = (time.perf_counter() - t0) * 1000.0

        t0 = time.perf_counter()
        # Crop empty margins only — keep a pristine full-res copy for Admin review.
        image = image_pipeline.trim_uniform_borders(image, max_trim_ratio=0.18)
        preview_source = image.copy()
        # Full-frame lighting normalize is optional (expensive on phone photos).
        if bool(getattr(settings, "TICKET_VISION_NORMALIZE_LIGHTING", False)):
            image = image_pipeline.normalize_lighting(image)
        image = image_pipeline.resize_if_needed(image, self._max_image_dimension)
        image_height, image_width = image.shape[:2]
        preview_h, preview_w = preview_source.shape[:2]
        preview_scale_x = preview_w / float(image_width) if image_width else 1.0
        preview_scale_y = preview_h / float(image_height) if image_height else 1.0
        stage_ms["preprocess"] = (time.perf_counter() - t0) * 1000.0

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
        stations_json = _compact_stations_json(stations_payload)
        # YOLO first: detect ticket boxes once, then OCR each crop — never OCR the
        # full table background when tickets are already localized.
        t0 = time.perf_counter()
        # Skip unused JPEG encoding of guidance crops on the per-ticket path.
        yolo_guidance = build_yolo_llm_guidance(
            image,
            max_tickets=max_tickets,
            encode_crops=False,
        )
        stage_ms["yolo_detection"] = (time.perf_counter() - t0) * 1000.0
        ordered_layouts: list = []
        used_per_ticket_ocr = False

        if yolo_guidance.ticket_count >= 1:
            logger.info(
                "Per-ticket OCR path: yolo_tickets=%s (skipping full-frame vision)",
                yolo_guidance.ticket_count,
            )
            t0 = time.perf_counter()
            extraction = self._scan_yolo_tickets_independently(
                yolo_guidance=yolo_guidance,
                image=image,
                stations_json=stations_json,
                max_tickets=max_tickets,
            )
            stage_ms["ocr_request"] = (time.perf_counter() - t0) * 1000.0
            used_per_ticket_ocr = True
        else:
            # No ticket boxes: fall back to full-frame + template field crops.
            t0 = time.perf_counter()
            vision_image_bytes = image_pipeline.encode_to_jpeg_bytes_bounded(
                image,
                max_bytes=3_000_000,
                quality_start=95,
                quality_floor=90,
                max_dimension=self._max_image_dimension,
                allow_geometry_shrink=False,
            )
            layout_hint, layout_crops, ordered_layouts = _build_layout_guidance(
                metadata,
                image,
                image_width,
                image_height,
                crop_source=preview_source,
                crop_scale_x=preview_scale_x,
                crop_scale_y=preview_scale_y,
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
            merged_crops = limit_vision_extra_images(
                merged_crops,
                prefer_ticket_crops=False,
            )
            prompt = build_ticket_extraction_prompt(
                stations_json,
                max_tickets,
                image_width,
                image_height,
                field_layouts_hint=merged_hint,
            )
            stage_ms["template_layout"] = (time.perf_counter() - t0) * 1000.0
            t0 = time.perf_counter()
            extraction = self._vision_client.analyze_ticket_image(
                vision_image_bytes,
                prompt,
                extra_images=merged_crops or None,
            )
            stage_ms["ocr_request"] = (time.perf_counter() - t0) * 1000.0

        # Template alternate-crop retry only for full-frame scans (layouts are
        # normalized to the whole image, not per-ticket crops).
        if not used_per_ticket_ocr:
            t0 = time.perf_counter()
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
            stage_ms["ocr_retry"] = (time.perf_counter() - t0) * 1000.0

        warnings = list(extraction.warnings)
        if len(extraction.tickets) > max_tickets:
            warnings.append(
                f"{self._provider_label} trả về {len(extraction.tickets)} vé; "
                f"chỉ xử lý {max_tickets} vé đầu."
            )

        t0 = time.perf_counter()
        tickets: list[TicketScanResult] = []
        llm_tickets = extraction.tickets[:max_tickets]
        yolo_ticket_boxes = list(yolo_guidance.ticket_boxes or [])
        yolo_ticket_fields = list(getattr(yolo_guidance, "ticket_field_boxes", None) or [])
        used_yolo_indices: set[int] = set()

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
                        yolo_ticket_boxes,
                        yolo_ticket_fields,
                        used_yolo_indices,
                        preview_source=preview_source,
                        preview_scale_x=preview_scale_x,
                        preview_scale_y=preview_scale_y,
                    )
                )
            except Exception:  # noqa: BLE001
                logger.exception(
                    "Failed to map %s ticket #%s", self._provider_label, index
                )
                warnings.append(f"Vé #{index + 1}: xử lý thất bại, đã bỏ qua.")
        stage_ms["map_validate"] = (time.perf_counter() - t0) * 1000.0

        warnings = localize_scan_warnings(warnings)

        if not tickets and not warnings:
            warnings.append(
                f"{self._provider_label} không phát hiện vé nào trong ảnh."
            )

        stage_ms["total"] = (time.perf_counter() - t_all) * 1000.0
        logger.info(
            "OCR stage timings ms: %s (tickets=%s per_ticket=%s)",
            {k: int(round(v)) for k, v in stage_ms.items()},
            len(tickets),
            used_per_ticket_ocr,
        )

        return ScanResponse(
            scanId=str(uuid.uuid4()),
            ticketCount=len(tickets),
            tickets=tickets,
            warnings=warnings,
            imageWidth=image_width,
            imageHeight=image_height,
        )

    def _scan_yolo_tickets_independently(
        self,
        *,
        yolo_guidance,
        image: np.ndarray,
        stations_json: str,
        max_tickets: int,
    ):
        """YOLO detect once → crop tickets → Groq OCR.

        - 1 ticket: one crop (+ optional YOLO field extras for numbers/serial)
        - 2..PARALLEL_MAX tickets: concurrent single-ticket Groq calls (accuracy)
        - more tickets: one labeled collage (speed / RPM)
        Admin review crops are built later in ``_map_ticket``.
        """
        image_h, image_w = image.shape[:2]

        ocr_max_dim = int(settings.TICKET_VISION_OCR_CROP_MAX_DIMENSION)
        ocr_max_bytes = int(settings.TICKET_VISION_OCR_CROP_MAX_BYTES)
        collage_cell_h = int(settings.TICKET_VISION_OCR_COLLAGE_CELL_MAX_HEIGHT)
        collage_cols = int(settings.TICKET_VISION_OCR_COLLAGE_COLUMNS)
        parallel_max = int(getattr(settings, "TICKET_VISION_PER_TICKET_PARALLEL_MAX", 8) or 8)
        workers = max(1, int(getattr(settings, "TICKET_VISION_PER_TICKET_OCR_WORKERS", 4) or 4))
        # Legacy-first boost: one collage for multi-ticket instead of N Groq
        # calls that burn free-tier ITPM and wait on Retry-After.
        if (
            bool(getattr(settings, "TICKET_VISION_LEGACY_FIRST", True))
            and bool(getattr(settings, "TICKET_VISION_LLM_BOOST_USE_COLLAGE", True))
        ):
            parallel_max = 1
        ticket_fields = list(getattr(yolo_guidance, "ticket_field_boxes", None) or [])

        t_crop = time.perf_counter()
        prepared: list[dict] = []
        for index, (tx, ty, tw, th) in enumerate(yolo_guidance.ticket_boxes or []):
            if len(prepared) >= max_tickets:
                break
            yolo_box = BoundingBox(
                x=tx,
                y=ty,
                width=tw,
                height=th,
                corners=[[tx, ty], [tx + tw, ty], [tx + tw, ty + th], [tx, ty + th]],
            )
            x, y, bw, bh = image_pipeline.expand_bbox(
                yolo_box.x,
                yolo_box.y,
                yolo_box.width,
                yolo_box.height,
                image_w,
                image_h,
                pad_ratio=0.02,
            )
            crop = image[y : y + bh, x : x + bw]
            if crop is None or crop.size == 0:
                continue
            # Second-chance FP filter after expand_bbox (dark wood / glass).
            probe_box = np.asarray([x, y, x + bw, y + bh], dtype="float32")
            if not _crop_looks_like_ticket(image, probe_box):
                logger.info(
                    "Skipping non-ticket crop #%s after expand (dark/empty)",
                    index,
                )
                continue
            prepared.append(
                {
                    "index": index,
                    "yolo_box": yolo_box,
                    "crop": np.ascontiguousarray(crop),
                    "crop_w": int(crop.shape[1]),
                    "crop_h": int(crop.shape[0]),
                    "offset_x": int(x),
                    "offset_y": int(y),
                    "crop_w_frame": int(bw),
                    "crop_h_frame": int(bh),
                    "field_boxes": ticket_fields[index] if index < len(ticket_fields) else {},
                }
            )
        crop_ms = (time.perf_counter() - t_crop) * 1000.0

        if not prepared:
            return ScanExtractionResult(tickets=[], warnings=[])

        def _empty_ticket(item: dict) -> TicketExtraction:
            yolo_box = item["yolo_box"]
            return TicketExtraction(
                bbox=TicketBBox(
                    x=float(yolo_box.x),
                    y=float(yolo_box.y),
                    width=float(yolo_box.width),
                    height=float(yolo_box.height),
                ),
                fieldConfidences={},
            )

        def _pin_yolo_only(ticket: TicketExtraction, yolo_box: BoundingBox) -> TicketExtraction:
            return ticket.model_copy(
                update={
                    "bbox": TicketBBox(
                        x=float(yolo_box.x),
                        y=float(yolo_box.y),
                        width=float(yolo_box.width),
                        height=float(yolo_box.height),
                    ),
                    "fieldBoxes": {},
                }
            )

        def _encode_ocr_jpeg(arr: np.ndarray) -> bytes:
            return image_pipeline.encode_to_jpeg_bytes_bounded(
                arr,
                max_bytes=ocr_max_bytes,
                quality_start=88,
                quality_floor=78,
                max_dimension=ocr_max_dim,
                allow_geometry_shrink=True,
            )

        def _prepare_ocr_crop(arr: np.ndarray) -> np.ndarray:
            """Adaptive OCR prep per crop — clear photos stay untouched."""
            return image_pipeline.enhance_for_ocr(arr)

        def _field_extras(item: dict) -> list[tuple[str, bytes]]:
            """Attach YOLO field zooms — prefer serialNumber then numbers."""
            extras: list[tuple[str, bytes]] = []
            boxes = item.get("field_boxes") or {}
            # Serial first: collage/multi often miss the letter+digits glyph band.
            for field_name in ("serialNumber", "numbers"):
                box = boxes.get(field_name)
                if not box or len(box) != 4:
                    continue
                fx, fy, fw, fh = (int(v) for v in box)
                fx, fy, fw, fh = image_pipeline.expand_bbox(
                    fx, fy, fw, fh, image_w, image_h, pad_ratio=0.02
                )
                field_crop = image[fy : fy + fh, fx : fx + fw]
                if field_crop is None or field_crop.size == 0:
                    continue
                try:
                    extras.append(
                        (f"field:{field_name}", _encode_ocr_jpeg(_prepare_ocr_crop(field_crop)))
                    )
                except Exception:  # noqa: BLE001
                    continue
                if len(extras) >= 2:
                    break
            return extras

        def _ocr_one_ticket(item: dict) -> tuple[TicketExtraction, list[str]]:
            local_warnings: list[str] = []
            try:
                vision_bytes = _encode_ocr_jpeg(_prepare_ocr_crop(item["crop"]))
            except Exception:  # noqa: BLE001
                logger.exception("Failed to encode ticket crop #%s", item["index"])
                return _empty_ticket(item), [
                    f"Vé #{item['index'] + 1}: OCR thất bại, đã bỏ qua."
                ]
            use_extras = (
                len(prepared) == 1
                or bool(getattr(settings, "TICKET_VISION_OCR_FIELD_EXTRAS_ON_MULTI", True))
            )
            extras = _field_extras(item) if use_extras else []
            # Cap at 1 extra on multi-ticket to stay under ITPM (ticket + serial zoom).
            if len(prepared) > 1 and extras:
                extras = extras[:1]
            extra_hint = None
            if extras:
                names = ", ".join(label.split(":", 1)[-1] for label, _ in extras)
                extra_hint = (
                    f"Extra images are tight zooms of: {names}. "
                    "Prefer those crops for the named fields. "
                    "serialNumber must be letter+digits (A123456), not lot code (4E2)."
                )
            prompt = _build_single_ticket_extraction_prompt(
                stations_json,
                item["crop_w"],
                item["crop_h"],
                extra_crop_hint=extra_hint,
            )
            try:
                crop_result = self._vision_client.analyze_ticket_image(
                    vision_bytes,
                    prompt,
                    extra_images=extras or None,
                )
            except VisionClientError:
                raise
            except Exception as exc:  # noqa: BLE001
                logger.exception("Single-ticket OCR failed for YOLO ticket #%s", item["index"])
                raise VisionApiError(
                    f"Single-ticket OCR failed for YOLO ticket #{item['index']}: {exc}"
                ) from exc
            llm_ticket = (crop_result.tickets or [None])[0]
            if llm_ticket is None:
                local_warnings.append(
                    f"Vé #{item['index'] + 1}: chưa đọc được nội dung từ vùng vé đã phát hiện."
                )
                return _empty_ticket(item), local_warnings + list(crop_result.warnings or [])
            remapped = _remap_ticket_extraction_from_crop(
                llm_ticket,
                offset_x=item["offset_x"],
                offset_y=item["offset_y"],
                crop_width=item["crop_w_frame"],
                crop_height=item["crop_h_frame"],
                full_width=image_w,
                full_height=image_h,
                fallback_box=item["yolo_box"],
            )
            for warning in crop_result.warnings or []:
                if warning and warning not in local_warnings:
                    local_warnings.append(warning)
            return _pin_yolo_only(remapped, item["yolo_box"]), local_warnings

        warnings: list[str] = []
        t_ocr = time.perf_counter()

        # --- Single ticket or small multi-ticket: concurrent per-ticket OCR ---
        if len(prepared) <= max(1, parallel_max):
            tickets: list[TicketExtraction] = [_empty_ticket(item) for item in prepared]
            if len(prepared) == 1:
                ticket, local_warnings = _ocr_one_ticket(prepared[0])
                tickets[0] = ticket
                warnings.extend(local_warnings)
            else:
                max_workers = min(workers, len(prepared))
                logger.info(
                    "Per-ticket OCR: mode=parallel tickets=%s workers=%s crop_ms=%s",
                    len(prepared),
                    max_workers,
                    int(round(crop_ms)),
                )
                with ThreadPoolExecutor(max_workers=max_workers) as pool:
                    future_map = {
                        pool.submit(_ocr_one_ticket, item): pos
                        for pos, item in enumerate(prepared)
                    }
                    for future in as_completed(future_map):
                        pos = future_map[future]
                        try:
                            ticket, local_warnings = future.result()
                        except VisionClientError:
                            raise
                        except Exception:  # noqa: BLE001
                            logger.exception(
                                "Parallel OCR failed for ticket #%s",
                                prepared[pos]["index"],
                            )
                            ticket = _empty_ticket(prepared[pos])
                            local_warnings = [
                                f"Vé #{prepared[pos]['index'] + 1}: OCR thất bại, đã bỏ qua."
                            ]
                        tickets[pos] = ticket
                        for warning in local_warnings:
                            if warning and warning not in warnings:
                                warnings.append(warning)
            logger.info(
                "Per-ticket OCR done: mode=%s wall_ms=%s tickets=%s",
                "single" if len(prepared) == 1 else "parallel",
                int(round((time.perf_counter() - t_ocr) * 1000.0)),
                len(prepared),
            )
            return ScanExtractionResult(tickets=tickets[:max_tickets], warnings=warnings)

        # --- Many tickets: one collage → one Groq call ---
        try:
            collage = _build_ticket_ocr_collage(
                [_prepare_ocr_crop(item["crop"]) for item in prepared],
                cell_max_height=collage_cell_h,
                columns=collage_cols,
            )
            collage_bytes = _encode_ocr_jpeg(collage)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to build/encode multi-ticket OCR collage")
            return ScanExtractionResult(
                tickets=[_empty_ticket(item) for item in prepared],
                warnings=["Không tạo được ảnh ghép OCR; vui lòng quét lại."],
            )

        collage_h, collage_w = collage.shape[:2]
        cell_lines = "\n".join(
            f"  - cell #{pos} (label #{item['index']}): ticket index {pos}"
            for pos, item in enumerate(prepared)
        )
        prompt = _build_collage_extraction_prompt(
            stations_json,
            len(prepared),
            collage_w,
            collage_h,
            cell_lines,
        )
        logger.info(
            "Per-ticket OCR: mode=collage crops=%s collage=%sx%s bytes=%s crop_ms=%s",
            len(prepared),
            collage_w,
            collage_h,
            len(collage_bytes),
            int(round(crop_ms)),
        )
        try:
            crop_result = self._vision_client.analyze_ticket_image(collage_bytes, prompt)
        except VisionClientError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception("Collage OCR failed for %s tickets", len(prepared))
            raise VisionApiError(
                f"Collage OCR failed for {len(prepared)} tickets: {exc}"
            ) from exc

        llm_tickets = list(crop_result.tickets or [])
        tickets = []
        for pos, item in enumerate(prepared):
            llm_ticket = llm_tickets[pos] if pos < len(llm_tickets) else None
            if llm_ticket is None:
                tickets.append(_empty_ticket(item))
                warnings.append(
                    f"Vé #{item['index'] + 1}: chưa đọc được nội dung từ vùng vé đã phát hiện."
                )
                continue
            tickets.append(_pin_yolo_only(llm_ticket, item["yolo_box"]))

        for warning in crop_result.warnings or []:
            if warning and warning not in warnings:
                warnings.append(warning)

        logger.info(
            "Per-ticket OCR done: mode=collage wall_ms=%s tickets=%s returned=%s",
            int(round((time.perf_counter() - t_ocr) * 1000.0)),
            len(prepared),
            len(llm_tickets),
        )
        return ScanExtractionResult(tickets=tickets[:max_tickets], warnings=warnings)

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
                    crop_bytes = image_pipeline.encode_to_jpeg_bytes_bounded(
                        crop,
                        max_bytes=1_200_000,
                        quality_start=92,
                        quality_floor=85,
                        allow_geometry_shrink=True,
                    )
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
                json.dumps(
                    [
                        {
                            "name": s.get("name"),
                            "code": s.get("code"),
                            "expectedNumberLength": s.get("expectedNumberLength"),
                        }
                        for s in stations_payload
                        if isinstance(s, dict)
                    ],
                    ensure_ascii=False,
                ),
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
            vision_image_bytes = image_pipeline.encode_to_jpeg_bytes_bounded(
                image,
                max_bytes=3_000_000,
                quality_start=94,
                quality_floor=85,
                max_dimension=self._max_image_dimension,
                allow_geometry_shrink=False,
            )
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
        yolo_ticket_boxes: list[tuple[int, int, int, int]] | None = None,
        yolo_ticket_fields: list[dict[str, tuple[int, int, int, int]]] | None = None,
        used_yolo_indices: set[int] | None = None,
        preview_source: np.ndarray | None = None,
        preview_scale_x: float = 1.0,
        preview_scale_y: float = 1.0,
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

        serial_number, batch_code = reconcile_serial_and_batch_code(
            _normalize_serial(llm_ticket.serialNumber),
            _normalize_batch_code(llm_ticket.batchCode),
        )
        extracted = ExtractedTicketFields(
            stationName=station_name,
            stationCode=station_code,
            serialNumber=serial_number,
            numbers=_normalize_numbers(llm_ticket.numbers),
            drawDate=_normalize_draw_date(llm_ticket.drawDate),
            ticketType=format_price_vnd(llm_ticket.ticketType),
            batchCode=batch_code,
        )

        field_confidences = _field_confidences(llm_ticket, extracted)
        # If we moved a misplaced batch code out of serialNumber, don't keep a
        # high serial confidence for an empty/corrected field.
        raw_serial = _normalize_serial(llm_ticket.serialNumber)
        if raw_serial and serial_number != raw_serial:
            if serial_number is None:
                field_confidences["serialNumber"] = 0.0
            if batch_code == raw_serial and (
                not llm_ticket.batchCode or _normalize_batch_code(llm_ticket.batchCode) != batch_code
            ):
                field_confidences["batchCode"] = max(
                    field_confidences.get("batchCode", 0.0),
                    _clamp_confidence((llm_ticket.fieldConfidences or {}).get("serialNumber")),
                )

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

        used = used_yolo_indices if used_yolo_indices is not None else set()
        bbox, llm_ticket_box, yolo_index = _resolve_bbox(
            llm_ticket.bbox,
            image_width,
            image_height,
            index,
            total_tickets,
            yolo_ticket_boxes,
            used_yolo_indices=used,
        )
        if yolo_index is not None:
            used.add(yolo_index)

        field_boxes = _resolve_field_boxes(llm_ticket.fieldBoxes, image_width, image_height)
        if llm_ticket_box is not None and (
            llm_ticket_box.x != bbox.x
            or llm_ticket_box.y != bbox.y
            or llm_ticket_box.width != bbox.width
            or llm_ticket_box.height != bbox.height
        ):
            field_boxes = _remap_field_boxes_to_ticket(
                field_boxes,
                llm_ticket_box,
                bbox,
                image_width,
                image_height,
            )
        yolo_fields = None
        if (
            yolo_index is not None
            and yolo_ticket_fields
            and 0 <= yolo_index < len(yolo_ticket_fields)
        ):
            yolo_fields = yolo_ticket_fields[yolo_index]
        field_boxes = _merge_yolo_field_boxes(
            field_boxes,
            yolo_fields,
            image_width,
            image_height,
        )

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
        crop_local_fields = field_boxes
        if self._include_cropped_image:
            # Crop from the pre-downscale, pre-enhance frame so Admin review stays sharp.
            source = preview_source if preview_source is not None else image
            preview_bbox = (
                _scale_bbox(bbox, preview_scale_x, preview_scale_y)
                if preview_source is not None
                and (abs(preview_scale_x - 1.0) > 1e-6 or abs(preview_scale_y - 1.0) > 1e-6)
                else bbox
            )
            src_h, src_w = source.shape[:2]
            cx, cy, cw, ch = image_pipeline.expand_bbox(
                preview_bbox.x,
                preview_bbox.y,
                preview_bbox.width,
                preview_bbox.height,
                src_w,
                src_h,
                pad_ratio=0.02,
            )
            crop = source[cy : cy + ch, cx : cx + cw]
            if crop.size > 0:
                max_dim = int(
                    getattr(settings, "TICKET_VISION_REVIEW_CROP_MAX_DIMENSION", 1400) or 1400
                )
                quality = int(
                    getattr(settings, "TICKET_VISION_REVIEW_CROP_JPEG_QUALITY", 90) or 90
                )
                working = image_pipeline.resize_if_needed(crop, max_dim)
                cropped_image_base64 = image_pipeline.encode_to_base64_jpeg(
                    working, quality=quality
                ) or None
                # Field overlays belong on the cropped preview, not the source photo.
                ph, pw = working.shape[:2]
                # Map YOLO/LLM boxes from the scan frame into preview-source space.
                scale_back_x = preview_scale_x if preview_source is not None else 1.0
                scale_back_y = preview_scale_y if preview_source is not None else 1.0
                full_frame_for_crop = {
                    name: _scale_bbox(box, scale_back_x, scale_back_y)
                    for name, box in (field_boxes or {}).items()
                }
                crop_local_fields = _field_boxes_full_to_crop_local(
                    full_frame_for_crop,
                    crop_x=cx,
                    crop_y=cy,
                    crop_w=cw,
                    crop_h=ch,
                    preview_w=pw,
                    preview_h=ph,
                )

        return TicketScanResult(
            ticketIndex=index,
            bbox=bbox,
            status=status,
            confidence=confidence,
            extracted=extracted,
            fieldConfidences=field_confidences,
            fieldBoxes=crop_local_fields,
            usedFieldLayouts=used_field_layouts,
            missingFields=validation.missing_fields,
            validationErrors=validation.errors,
            croppedImageBase64=cropped_image_base64,
            imageWidth=image_width,
            imageHeight=image_height,
        )
