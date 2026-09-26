"""YOLO guidance for the LLM (Groq/Gemini/Grok) ticket-scan path.

Pipeline role (Rule A — YOLO first, template fills gaps):

  Ticket image
    → YOLO detects ticket + field boxes (best.pt)
    → OCR Template/Layout crops fill fields YOLO missed
    → merged crops + hint text → Groq vision
    → existing validation / ScanResponse mapping

Soft-fails when weights or ultralytics are missing so CI / deploys without
``models/best.pt`` still scan via full-image + template layouts only.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import cv2
import numpy as np

from domain.detection import yolo_model
from domain.detection.factory import resolve_model_path
from domain.detection.yolo_obb_detector import to_numpy
from domain.layouts.yolo_field_layout import DEFAULT_CLASS_TO_FIELD, _padded_crop
from domain.preprocessing import pipeline as image_pipeline
from infra.config import settings
from infra.logger import logger

YOLO_FIELD_CROP_PREFIX = "yolo-field-crop:"
YOLO_TICKET_CROP_PREFIX = "yolo-ticket-crop:"
TEMPLATE_FIELD_CROP_PREFIX = "field-crop:"

# qwen/qwen3.8-27b (current Groq vision default) accepts at most 3 images total
# (1 full frame + extras). Sending YOLO ticket + field crops without a cap
# causes HTTP 400 "Too many images provided".
GROQ_MAX_TOTAL_IMAGES = 3
GROQ_MAX_EXTRA_IMAGES = GROQ_MAX_TOTAL_IMAGES - 1

_FIELD_CROP_PRIORITY = {
    "numbers": 10,
    "serialNumber": 20,
    "stationName": 30,
    "drawDate": 40,
    "ticketType": 50,
    "batchCode": 60,
}

@dataclass
class YoloLlmGuidance:
    hint: str | None = None
    crops: list[tuple[str, bytes]] = field(default_factory=list)
    """Fields for which YOLO produced a crop (Rule A winners)."""
    fields_covered: set[str] = field(default_factory=set)
    ticket_count: int = 0
    """Axis-aligned ticket boxes (x, y, w, h) in full-frame pixel space."""
    ticket_boxes: list[tuple[int, int, int, int]] = field(default_factory=list)
    """Detection confidence aligned with ``ticket_boxes`` (same index)."""
    ticket_confidences: list[float] = field(default_factory=list)
    """Per-ticket field boxes aligned with ``ticket_boxes`` (same index)."""
    ticket_field_boxes: list[dict[str, tuple[int, int, int, int]]] = field(
        default_factory=list
    )


def _box_center(box: np.ndarray) -> tuple[float, float]:
    x1, y1, x2, y2 = (float(v) for v in box)
    return (x1 + x2) / 2.0, (y1 + y2) / 2.0


def _point_in_xyxy(px: float, py: float, box: np.ndarray, *, pad: float = 8.0) -> bool:
    x1, y1, x2, y2 = (float(v) for v in box)
    return (x1 - pad) <= px <= (x2 + pad) and (y1 - pad) <= py <= (y2 + pad)


def _xyxy_to_xywh(box: np.ndarray) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = (int(round(float(v))) for v in box)
    px = max(x1, 0)
    py = max(y1, 0)
    return px, py, max(1, x2 - x1), max(1, y2 - y1)


def _xyxy_iou(a: np.ndarray, b: np.ndarray) -> float:
    ax1, ay1, ax2, ay2 = (float(v) for v in a)
    bx1, by1, bx2, by2 = (float(v) for v in b)
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def _ticket_aspect_ok(width: float, height: float) -> bool:
    """Paper lottery tickets are roughly portrait rectangles — reject blobs."""
    w = max(1.0, float(width))
    h = max(1.0, float(height))
    aspect = min(w, h) / max(w, h)
    min_a = float(getattr(settings, "TICKET_VISION_YOLO_TICKET_MIN_ASPECT", 0.28) or 0.28)
    max_a = float(getattr(settings, "TICKET_VISION_YOLO_TICKET_MAX_ASPECT", 0.72) or 0.72)
    return min_a <= aspect <= max_a


def _crop_looks_like_ticket(image: np.ndarray, box: np.ndarray) -> bool:
    """Reject dark / near-uniform background crops (wood table, glass, void)."""
    if not bool(getattr(settings, "TICKET_VISION_YOLO_REJECT_EMPTY_CROPS", True)):
        return True
    x1, y1, x2, y2 = (int(round(float(v))) for v in box)
    h, w = image.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    if x2 - x1 < 16 or y2 - y1 < 16:
        return False
    crop = image[y1:y2, x1:x2]
    if crop is None or crop.size == 0:
        return False
    probe_h, probe_w = crop.shape[:2]
    scale = min(1.0, 160.0 / float(max(probe_h, probe_w)))
    if scale < 0.999:
        crop = cv2.resize(
            crop,
            (max(1, int(probe_w * scale)), max(1, int(probe_h * scale))),
            interpolation=cv2.INTER_AREA,
        )
    gray = crop if len(crop.shape) == 2 else cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    mean = float(gray.mean())
    std = float(gray.std())
    # Table wood / dark void: very dark or almost no contrast.
    if mean < 28.0 or mean > 245.0:
        return False
    if std < 12.0:
        return False
    edge = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if edge < 18.0:
        return False
    return True


def _nms_ticket_boxes(
    tickets: list[tuple[float, np.ndarray]],
    *,
    iou_threshold: float,
) -> list[tuple[float, np.ndarray]]:
    """Keep spatially distinct tickets (high IoU = duplicate of the same ticket)."""
    kept: list[tuple[float, np.ndarray]] = []
    for conf, box in sorted(tickets, key=lambda item: item[0], reverse=True):
        if any(_xyxy_iou(box, other) >= iou_threshold for _, other in kept):
            continue
        kept.append((conf, box))
    return kept


def _sort_tickets_reading_order(
    tickets: list[tuple[float, np.ndarray]],
) -> list[tuple[float, np.ndarray]]:
    """Top-to-bottom, then left-to-right — matches Admin review row order."""

    def _key(item: tuple[float, np.ndarray]) -> tuple[float, float]:
        x1, y1, x2, y2 = (float(v) for v in item[1])
        return ((y1 + y2) / 2.0, (x1 + x2) / 2.0)

    return sorted(tickets, key=_key)


def build_yolo_llm_guidance(
    image: np.ndarray,
    *,
    max_tickets: int,
    encode_crops: bool = True,
) -> YoloLlmGuidance:
    """Run one YOLO inference on the resized scan image; return LLM crops/hints.

    Uses the same multi-class ``best.pt`` as the legacy detector/field layout:
    ``Lottery-ticket`` plus mapped field classes. Never raises into the scan.

    When ``encode_crops`` is False (per-ticket OCR path), skip JPEG encoding of
    ticket/field crops — only boxes are needed and encoding every crop twice
    wastes CPU on multi-ticket photos.
    """
    if not settings.TICKET_VISION_LLM_YOLO_GUIDANCE:
        return YoloLlmGuidance()

    model_path = resolve_model_path(settings.TICKET_VISION_YOLO_MODEL_PATH)
    if not yolo_model.is_available(model_path):
        logger.info(
            "LLM YOLO guidance skipped: weights/deps unavailable at %s",
            model_path,
        )
        return YoloLlmGuidance()

    try:
        prediction = yolo_model.load_model(model_path).predict(
            image,
            conf=settings.TICKET_VISION_YOLO_FIELD_CONFIDENCE_THRESHOLD,
            iou=settings.TICKET_VISION_YOLO_IOU_THRESHOLD,
            device=settings.TICKET_VISION_YOLO_DEVICE,
            verbose=False,
        )[0]
    except Exception:  # noqa: BLE001 — guidance must not fail the scan
        logger.exception("LLM YOLO guidance inference failed; continuing without it")
        return YoloLlmGuidance()

    obb = getattr(prediction, "obb", None)
    names = dict(getattr(prediction, "names", None) or {})
    if obb is None or len(obb) == 0 or not names:
        return YoloLlmGuidance()

    boxes = to_numpy(obb.xyxy)
    classes = to_numpy(obb.cls).tolist()
    confidences = (
        to_numpy(obb.conf).tolist()
        if getattr(obb, "conf", None) is not None
        else [1.0] * len(boxes)
    )

    ticket_class = settings.TICKET_VISION_YOLO_TICKET_CLASS.strip().lower()
    class_to_field = {
        key.strip().lower(): value for key, value in DEFAULT_CLASS_TO_FIELD.items()
    }

    height, width = image.shape[:2]
    # Keep every field detection (not just global best) so multi-ticket photos
    # can assign fields to the correct ticket.
    field_detections: list[tuple[str, float, np.ndarray]] = []
    ticket_boxes: list[tuple[float, np.ndarray]] = []
    unmapped_classes: dict[str, int] = {}

    for box, class_id, confidence in zip(boxes, classes, confidences):
        raw_name = str(names.get(int(class_id), "")).strip().lower()
        conf = float(confidence)
        if raw_name == ticket_class:
            ticket_boxes.append((conf, box))
            continue
        field_name = class_to_field.get(raw_name)
        if field_name is None:
            if raw_name:
                unmapped_classes[raw_name] = unmapped_classes.get(raw_name, 0) + 1
            continue
        field_detections.append((field_name, conf, box))

    ticket_boxes.sort(key=lambda item: item[0], reverse=True)
    min_ticket_conf = float(
        getattr(
            settings,
            "TICKET_VISION_YOLO_TICKET_MIN_CONFIDENCE",
            settings.TICKET_VISION_YOLO_CONFIDENCE_THRESHOLD,
        )
        or settings.TICKET_VISION_YOLO_CONFIDENCE_THRESHOLD
    )
    min_area_ratio = float(
        getattr(settings, "TICKET_VISION_YOLO_TICKET_MIN_AREA_RATIO", 0.015) or 0.015
    )
    min_ticket_area = max(400.0, float(height * width) * min_area_ratio)
    filtered_tickets: list[tuple[float, np.ndarray]] = []
    for conf, box in ticket_boxes:
        if conf < min_ticket_conf:
            continue
        x1, y1, x2, y2 = (float(v) for v in box)
        bw, bh = max(0.0, x2 - x1), max(0.0, y2 - y1)
        area = bw * bh
        if area < min_ticket_area:
            continue
        # Reject absurd whole-image "tickets" that are mostly background.
        if area > float(height * width) * 0.85:
            continue
        if not _ticket_aspect_ok(bw, bh):
            continue
        if not _crop_looks_like_ticket(image, box):
            logger.info(
                "YOLO ticket rejected (empty/dark crop) conf=%.2f box=(%.0f,%.0f,%.0f,%.0f)",
                conf,
                x1,
                y1,
                x2,
                y2,
            )
            continue
        filtered_tickets.append((conf, box))

    filtered_tickets = _nms_ticket_boxes(
        filtered_tickets,
        iou_threshold=float(settings.TICKET_VISION_YOLO_IOU_THRESHOLD),
    )

    # Prefer tickets that contain at least one field detection (numbers/serial/…).
    # Background FPs rarely have mapped field boxes inside them.
    if (
        bool(getattr(settings, "TICKET_VISION_YOLO_REQUIRE_INNER_FIELD", True))
        and field_detections
        and filtered_tickets
    ):
        with_fields: list[tuple[float, np.ndarray]] = []
        without_fields: list[tuple[float, np.ndarray]] = []
        for conf, box in filtered_tickets:
            has_field = any(
                _point_in_xyxy(*_box_center(fbox), box, pad=16.0)
                for _, _, fbox in field_detections
            )
            (with_fields if has_field else without_fields).append((conf, box))
        if with_fields:
            if without_fields:
                logger.info(
                    "YOLO dropped %s ticket FP(s) without inner field boxes",
                    len(without_fields),
                )
            filtered_tickets = with_fields

    filtered_tickets = _sort_tickets_reading_order(filtered_tickets)
    ticket_boxes = filtered_tickets[: max(0, max_tickets)]
    if not ticket_boxes:
        logger.info("YOLO guidance: no plausible lottery tickets after FP filters")
        return YoloLlmGuidance()

    hint_lines: list[str] = []
    crops: list[tuple[str, bytes]] = []
    fields_covered: set[str] = set()
    ticket_pixel_boxes: list[tuple[int, int, int, int]] = []
    ticket_confidences: list[float] = []
    ticket_field_boxes: list[dict[str, tuple[int, int, int, int]]] = []
    ticket_raw_boxes: list[np.ndarray] = []

    for index, (conf, box) in enumerate(ticket_boxes):
        px, py, pw, ph = _xyxy_to_xywh(box)
        if encode_crops:
            crop = _padded_crop(image, box, height, width)
            if crop is None:
                continue
            try:
                crop_bytes = image_pipeline.encode_to_jpeg_bytes(crop, quality=95)
            except Exception:  # noqa: BLE001
                logger.exception("Failed to encode YOLO ticket crop #%s", index)
                continue
            crops.append((f"{YOLO_TICKET_CROP_PREFIX}{index}", crop_bytes))
        ticket_pixel_boxes.append((px, py, pw, ph))
        ticket_confidences.append(conf)
        ticket_raw_boxes.append(box)
        ticket_field_boxes.append({})
        hint_lines.append(
            f"- ticket #{index} (yolo, conf={conf:.2f}): "
            f"x={px}, y={py}, w={pw}, h={ph}"
        )

    # Assign each field detection to the ticket that contains its center.
    # Keep highest-confidence box per (ticket, field).
    best_per_ticket_field: dict[tuple[int, str], tuple[float, np.ndarray]] = {}
    orphan_fields: dict[str, tuple[float, np.ndarray]] = {}
    for field_name, conf, box in field_detections:
        cx, cy = _box_center(box)
        owner = None
        for ticket_index, ticket_box in enumerate(ticket_raw_boxes):
            if _point_in_xyxy(cx, cy, ticket_box, pad=12.0):
                owner = ticket_index
                break
        if owner is None:
            prev = orphan_fields.get(field_name)
            if prev is None or conf > prev[0]:
                orphan_fields[field_name] = (conf, box)
            continue
        key = (owner, field_name)
        prev = best_per_ticket_field.get(key)
        if prev is None or conf > prev[0]:
            best_per_ticket_field[key] = (conf, box)

    for (ticket_index, field_name), (conf, box) in best_per_ticket_field.items():
        ticket_field_boxes[ticket_index][field_name] = _xyxy_to_xywh(box)
        # Global extras: one best crop per field name (prefer highest conf).
        prev = orphan_fields.get(field_name)
        if prev is None or conf > prev[0]:
            orphan_fields[field_name] = (conf, box)

    for field_name, (conf, box) in sorted(orphan_fields.items()):
        px, py, pw, ph = _xyxy_to_xywh(box)
        if encode_crops:
            crop = _padded_crop(image, box, height, width)
            if crop is None:
                continue
            try:
                crop_bytes = image_pipeline.encode_to_jpeg_bytes(crop, quality=95)
            except Exception:  # noqa: BLE001
                logger.exception("Failed to encode YOLO field crop %s", field_name)
                continue
            crops.append((f"{YOLO_FIELD_CROP_PREFIX}{field_name}", crop_bytes))
        hint_lines.append(
            f"- {field_name} (yolo, conf={conf:.2f}): "
            f"x={px}, y={py}, w={pw}, h={ph}"
        )
        fields_covered.add(field_name)

    if not hint_lines:
        return YoloLlmGuidance()

    expected_core = ("serialNumber", "numbers", "stationName", "drawDate", "ticketType", "batchCode")
    missing_fields = [name for name in expected_core if name not in fields_covered]
    if missing_fields or unmapped_classes:
        logger.info(
            "YOLO field coverage: found=%s missing=%s unmapped_classes=%s "
            "(serial/batch often absent — model recall is weak; local heuristics fill gaps)",
            sorted(fields_covered),
            missing_fields,
            dict(sorted(unmapped_classes.items())) if unmapped_classes else {},
        )

    logger.info(
        "LLM YOLO guidance: tickets=%s fields=%s crops=%s",
        len(ticket_pixel_boxes),
        sorted(fields_covered),
        len(crops),
    )
    return YoloLlmGuidance(
        hint="\n".join(hint_lines) if hint_lines else None,
        crops=crops,
        fields_covered=fields_covered,
        ticket_count=len(ticket_pixel_boxes),
        ticket_boxes=ticket_pixel_boxes,
        ticket_confidences=ticket_confidences,
        ticket_field_boxes=ticket_field_boxes,
    )


def _template_crop_field_name(label: str) -> str | None:
    if not label.startswith(TEMPLATE_FIELD_CROP_PREFIX):
        return None
    rest = label[len(TEMPLATE_FIELD_CROP_PREFIX) :]
    # field-crop:{fieldName}:p{priority}[:id{id}]
    return rest.split(":", 1)[0] or None


def merge_yolo_and_template_guidance(
    yolo: YoloLlmGuidance,
    template_hint: str | None,
    template_crops: list[tuple[str, bytes]],
) -> tuple[str | None, list[tuple[str, bytes]]]:
    """Rule A: keep all YOLO crops; append template crops only for missing fields."""
    merged_crops = list(yolo.crops)
    for label, crop_bytes in template_crops:
        field_name = _template_crop_field_name(label)
        if field_name and field_name in yolo.fields_covered:
            continue
        merged_crops.append((label, crop_bytes))

    hint_parts: list[str] = []
    if yolo.hint:
        hint_parts.append("YOLO detections (prefer these crops when present):")
        hint_parts.append(yolo.hint)
    if template_hint:
        if yolo.fields_covered:
            hint_parts.append(
                "OCR template layouts (use when YOLO did not detect that field):"
            )
        else:
            hint_parts.append("OCR template field layouts:")
        hint_parts.append(template_hint)

    if not hint_parts:
        return None, merged_crops
    return "\n".join(hint_parts), merged_crops


def _field_name_from_crop_label(label: str) -> str | None:
    if label.startswith(YOLO_FIELD_CROP_PREFIX):
        return label[len(YOLO_FIELD_CROP_PREFIX) :] or None
    if label.startswith(TEMPLATE_FIELD_CROP_PREFIX):
        return _template_crop_field_name(label)
    if label.startswith("retry-field-crop:"):
        # retry-field-crop:{fieldName}:p{priority}:id{id}
        rest = label[len("retry-field-crop:") :]
        return rest.split(":", 1)[0] or None
    return None


def limit_vision_extra_images(
    crops: list[tuple[str, bytes]] | None,
    *,
    max_extra: int = GROQ_MAX_EXTRA_IMAGES,
    prefer_ticket_crops: bool | None = None,
) -> list[tuple[str, bytes]]:
    """Keep the most useful crops so (full image + extras) stays within Groq's limit.

    Single-ticket photos: prefer field zooms (numbers/serial) over a duplicate
    ticket crop of the full frame.

    Multi-ticket photos: prefer YOLO ticket crops so the model can read each
    small ticket clearly — field crops from the wrong ticket hurt more than they help.
    """
    if not crops:
        return []
    if max_extra <= 0:
        return []

    ticket_crops: list[tuple[str, bytes]] = []
    ranked_fields: list[tuple[int, str, bytes]] = []
    for label, data in crops:
        if not data:
            continue
        if label.startswith(YOLO_TICKET_CROP_PREFIX):
            ticket_crops.append((label, data))
            continue
        field_name = _field_name_from_crop_label(label)
        priority = _FIELD_CROP_PRIORITY.get(field_name or "", 100)
        ranked_fields.append((priority, label, data))

    ranked_fields.sort(key=lambda item: (item[0], item[1]))
    use_tickets = (
        prefer_ticket_crops
        if prefer_ticket_crops is not None
        else len(ticket_crops) >= 2
    )

    selected: list[tuple[str, bytes]] = []
    if use_tickets and ticket_crops:
        selected.extend(ticket_crops[:max_extra])
        remaining = max_extra - len(selected)
        if remaining > 0:
            selected.extend(
                (label, data) for _, label, data in ranked_fields[:remaining]
            )
    else:
        selected = [(label, data) for _, label, data in ranked_fields[:max_extra]]

    if len(crops) > len(selected):
        logger.info(
            "Limited vision extra images from %s to %s "
            "(ticket_crops=%s, prefer_tickets=%s, Groq max total images=%s)",
            len(crops),
            len(selected),
            len(ticket_crops),
            use_tickets,
            GROQ_MAX_TOTAL_IMAGES,
        )
    return selected
