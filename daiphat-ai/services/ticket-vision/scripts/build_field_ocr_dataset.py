#!/usr/bin/env python3
"""Build per-field crop datasets from Admin OCR training exports (Phase 3).

Input: JSONL from ``POST /api/v1/ai-models/exports`` (one row per field with
``labelValue``, ``croppedImageUrl`` / ``sourceImageUrl``, ``fieldName``).

For each row whose ``fieldName`` is in the target set, download the ticket
crop (prefer ``croppedImageUrl``), run YOLO field layout when ``best.pt`` is
available to cut a tight field crop, and write:

  <out>/<fieldName>/<ocrScanResultId>_<n>.jpg
  <out>/labels.jsonl   # {path, fieldName, labelValue, ocrScanResultId, ...}

Usage (from ``services/ticket-vision``):

  python scripts/build_field_ocr_dataset.py \\
    --jsonl path/to/export.jsonl \\
    --out data/field_ocr_dataset \\
    --fields serialNumber,numbers,drawDate

Without YOLO weights the script still writes full ticket crops labelled by
field — enough to start a recognizer dataset; re-run after ``best.pt`` is
present for tighter boxes.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

import cv2
import numpy as np

# Allow running as ``python scripts/build_field_ocr_dataset.py`` from the
# service directory (same import root as pytest / uvicorn).
_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))
_AI_ROOT = _SERVICE_ROOT.parents[1]
if str(_AI_ROOT) not in sys.path:
    sys.path.insert(0, str(_AI_ROOT))

from domain.layouts.yolo_field_layout import FIELD_REGION_PREFIX, YoloFieldLayoutStrategy  # noqa: E402
from infra.config import settings  # noqa: E402
from infra.logger import logger  # noqa: E402

DEFAULT_FIELDS = ("serialNumber", "numbers", "drawDate")


def _download_image(url: str, timeout: float = 30.0) -> np.ndarray | None:
    if not url or not str(url).strip():
        return None
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            data = response.read()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to download %s: %s", url, exc)
        return None
    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        logger.warning("Could not decode image from %s", url)
    return image


def _load_local_image(path: str | Path) -> np.ndarray | None:
    p = Path(path)
    if not p.is_file():
        return None
    image = cv2.imread(str(p), cv2.IMREAD_COLOR)
    return image


def _resolve_ticket_image(row: dict, image_root: Path | None) -> np.ndarray | None:
    for key in ("croppedImageUrl", "sourceImageUrl"):
        url = row.get(key)
        if not url:
            continue
        if str(url).startswith(("http://", "https://")):
            image = _download_image(str(url))
            if image is not None:
                return image
        local = Path(str(url))
        if not local.is_absolute() and image_root is not None:
            local = image_root / local
        image = _load_local_image(local)
        if image is not None:
            return image
    name = row.get("sourceImageName")
    if name and image_root is not None:
        return _load_local_image(image_root / str(name))
    return None


def _field_crop(
    ticket_image: np.ndarray,
    field_name: str,
    layout: YoloFieldLayoutStrategy | None,
) -> np.ndarray:
    if layout is None:
        return ticket_image
    try:
        regions = layout.get_regions(ticket_image)
    except Exception:  # noqa: BLE001
        logger.exception("YOLO field layout failed for %s", field_name)
        return ticket_image
    key = f"{FIELD_REGION_PREFIX}{field_name}"
    crop = regions.get(key)
    return crop if crop is not None and crop.size > 0 else ticket_image


def _parse_fields(raw: str) -> frozenset[str]:
    return frozenset(part.strip() for part in raw.split(",") if part.strip())


def build_dataset(
    jsonl_path: Path,
    out_dir: Path,
    fields: frozenset[str],
    image_root: Path | None,
    use_yolo: bool,
) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    labels_path = out_dir / "labels.jsonl"

    layout: YoloFieldLayoutStrategy | None = None
    if use_yolo:
        model_path = Path(settings.TICKET_VISION_YOLO_MODEL_PATH)
        if not model_path.is_absolute():
            model_path = _SERVICE_ROOT / model_path
        if model_path.is_file():
            layout = YoloFieldLayoutStrategy(
                model_path=str(model_path),
                confidence_threshold=settings.TICKET_VISION_YOLO_FIELD_CONFIDENCE_THRESHOLD,
                iou_threshold=settings.TICKET_VISION_YOLO_IOU_THRESHOLD,
                device=settings.TICKET_VISION_YOLO_DEVICE,
            )
            logger.info("Using YOLO field crops from %s", model_path)
        else:
            logger.warning("best.pt missing at %s — exporting full ticket crops", model_path)

    written = 0
    with jsonl_path.open(encoding="utf-8") as src, labels_path.open("w", encoding="utf-8") as labels_out:
        for line_no, line in enumerate(src, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                logger.warning("Skip invalid JSONL line %s", line_no)
                continue

            field_name = (row.get("fieldName") or "").strip()
            label = row.get("labelValue")
            if field_name not in fields or label is None or str(label).strip() == "":
                continue

            ticket = _resolve_ticket_image(row, image_root)
            if ticket is None:
                logger.warning(
                    "No image for ocrScanResultId=%s field=%s",
                    row.get("ocrScanResultId"),
                    field_name,
                )
                continue

            crop = _field_crop(ticket, field_name, layout)
            field_dir = out_dir / field_name
            field_dir.mkdir(parents=True, exist_ok=True)
            scan_id = row.get("ocrScanResultId") or f"line{line_no}"
            file_name = f"{scan_id}_{written}.jpg"
            rel_path = Path(field_name) / file_name
            abs_path = out_dir / rel_path
            if not cv2.imwrite(str(abs_path), crop):
                logger.warning("Failed to write %s", abs_path)
                continue

            record = {
                "path": str(rel_path).replace("\\", "/"),
                "fieldName": field_name,
                "labelValue": str(label).strip(),
                "ocrScanResultId": row.get("ocrScanResultId"),
                "stationId": row.get("stationId"),
                "aiValue": row.get("aiValue"),
                "isCorrected": row.get("isCorrected"),
                "usedYoloFieldCrop": layout is not None and crop is not ticket,
            }
            labels_out.write(json.dumps(record, ensure_ascii=False) + "\n")
            written += 1

    logger.info("Wrote %s field crops → %s (labels: %s)", written, out_dir, labels_path)
    return written


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jsonl", type=Path, required=True, help="Training export JSONL")
    parser.add_argument("--out", type=Path, required=True, help="Output dataset directory")
    parser.add_argument(
        "--fields",
        default=",".join(DEFAULT_FIELDS),
        help="Comma-separated field names to export",
    )
    parser.add_argument(
        "--image-root",
        type=Path,
        default=None,
        help="Optional local root for relative image paths / sourceImageName",
    )
    parser.add_argument(
        "--no-yolo",
        action="store_true",
        help="Skip YOLO field crops; always save full ticket images",
    )
    args = parser.parse_args(argv)

    if not args.jsonl.is_file():
        logger.error("JSONL not found: %s", args.jsonl)
        return 1

    count = build_dataset(
        jsonl_path=args.jsonl,
        out_dir=args.out,
        fields=_parse_fields(args.fields),
        image_root=args.image_root,
        use_yolo=not args.no_yolo,
    )
    return 0 if count > 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
