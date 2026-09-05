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

# qwen/qwen3.6-27b (and current Groq vision) accepts at most 3 images total
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


def build_yolo_llm_guidance(
    image: np.ndarray,
    *,
    max_tickets: int,
) -> YoloLlmGuidance:
    """Run one YOLO inference on the resized scan image; return LLM crops/hints.

    Uses the same multi-class ``best.pt`` as the legacy detector/field layout:
    ``Lottery-ticket`` plus mapped field classes. Never raises into the scan.
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
    best_fields: dict[str, tuple[float, np.ndarray]] = {}
    ticket_boxes: list[tuple[float, np.ndarray]] = []

    for box, class_id, confidence in zip(boxes, classes, confidences):
        raw_name = str(names.get(int(class_id), "")).strip().lower()
        conf = float(confidence)
        if raw_name == ticket_class:
            ticket_boxes.append((conf, box))
            continue
        field_name = class_to_field.get(raw_name)
        if field_name is None:
            continue
        if field_name not in best_fields or conf > best_fields[field_name][0]:
            best_fields[field_name] = (conf, box)

    ticket_boxes.sort(key=lambda item: item[0], reverse=True)
    ticket_boxes = ticket_boxes[: max(1, max_tickets)]

    hint_lines: list[str] = []
    crops: list[tuple[str, bytes]] = []
    fields_covered: set[str] = set()

    for index, (conf, box) in enumerate(ticket_boxes):
        crop = _padded_crop(image, box, height, width)
        if crop is None:
            continue
        try:
            crop_bytes = image_pipeline.encode_to_jpeg_bytes(crop)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to encode YOLO ticket crop #%s", index)
            continue
        x1, y1, x2, y2 = (int(round(float(v))) for v in box)
        hint_lines.append(
            f"- ticket #{index} (yolo, conf={conf:.2f}): "
            f"x={max(x1, 0)}, y={max(y1, 0)}, w={max(1, x2 - x1)}, h={max(1, y2 - y1)}"
        )
        crops.append((f"{YOLO_TICKET_CROP_PREFIX}{index}", crop_bytes))

    for field_name, (conf, box) in sorted(best_fields.items()):
        crop = _padded_crop(image, box, height, width)
        if crop is None:
            continue
        try:
            crop_bytes = image_pipeline.encode_to_jpeg_bytes(crop)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to encode YOLO field crop %s", field_name)
            continue
        x1, y1, x2, y2 = (int(round(float(v))) for v in box)
        hint_lines.append(
            f"- {field_name} (yolo, conf={conf:.2f}): "
            f"x={max(x1, 0)}, y={max(y1, 0)}, w={max(1, x2 - x1)}, h={max(1, y2 - y1)}"
        )
        crops.append((f"{YOLO_FIELD_CROP_PREFIX}{field_name}", crop_bytes))
        fields_covered.add(field_name)

    if not hint_lines:
        return YoloLlmGuidance()

    logger.info(
        "LLM YOLO guidance: tickets=%s fields=%s crops=%s",
        len(ticket_boxes),
        sorted(fields_covered),
        len(crops),
    )
    return YoloLlmGuidance(
        hint="\n".join(hint_lines),
        crops=crops,
        fields_covered=fields_covered,
        ticket_count=len(ticket_boxes),
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
) -> list[tuple[str, bytes]]:
    """Keep the most useful crops so (full image + extras) stays within Groq's limit.

    Skip YOLO ticket crops: the full frame is already sent, and a near-duplicate
    ticket crop often pushes free-tier ITPM over the limit (HTTP 413).
    """
    if not crops:
        return []
    if max_extra <= 0:
        return []

    ranked_fields: list[tuple[int, str, bytes]] = []
    skipped_ticket = 0
    for label, data in crops:
        if not data:
            continue
        if label.startswith(YOLO_TICKET_CROP_PREFIX):
            skipped_ticket += 1
            continue
        field_name = _field_name_from_crop_label(label)
        priority = _FIELD_CROP_PRIORITY.get(field_name or "", 100)
        ranked_fields.append((priority, label, data))

    ranked_fields.sort(key=lambda item: (item[0], item[1]))
    selected = [(label, data) for _, label, data in ranked_fields[:max_extra]]

    if skipped_ticket or len(crops) > len(selected):
        logger.info(
            "Limited vision extra images from %s to %s "
            "(skipped_ticket_crops=%s, Groq max total images=%s)",
            len(crops),
            len(selected),
            skipped_ticket,
            GROQ_MAX_TOTAL_IMAGES,
        )
    return selected
