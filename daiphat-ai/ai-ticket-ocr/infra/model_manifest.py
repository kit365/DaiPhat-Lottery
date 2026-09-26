"""Phase 4: model version / provenance for ops and /health.

Reads optional ``models/MODEL_MANIFEST.json`` next to ``best.pt``. Missing
files soft-degrade to config env overrides + weight file metadata.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from infra.config import settings


def _service_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _resolve(configured: str) -> Path:
    path = Path(configured)
    if path.is_absolute():
        return path
    return _service_root() / path


def _file_fingerprint(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        stat = path.stat()
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            # Short prefix hash is enough for ops identity without reading 50MB+.
            digest.update(handle.read(256 * 1024))
            if stat.st_size > 256 * 1024:
                handle.seek(max(0, stat.st_size - 64 * 1024))
                digest.update(handle.read(64 * 1024))
        return {
            "path": str(path.name),
            "bytes": stat.st_size,
            "mtime": int(stat.st_mtime),
            "sha256Prefix": digest.hexdigest()[:16],
        }
    except OSError:
        return None


def load_model_manifest() -> dict[str, Any]:
    """Return a JSON-serializable ops snapshot of detector / field OCR versions."""
    manifest_path = _resolve(
        getattr(settings, "TICKET_VISION_MODEL_MANIFEST_PATH", "models/MODEL_MANIFEST.json")
    )
    file_manifest: dict[str, Any] = {}
    if manifest_path.is_file():
        try:
            loaded = json.loads(manifest_path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                file_manifest = loaded
        except (OSError, json.JSONDecodeError):
            file_manifest = {}

    yolo_path = _resolve(settings.TICKET_VISION_YOLO_MODEL_PATH)
    yolo_version = (
        (file_manifest.get("yoloVersion") or "").strip()
        or (getattr(settings, "TICKET_VISION_YOLO_MODEL_VERSION", "") or "").strip()
        or "unversioned"
    )
    field_ocr_version = (
        (file_manifest.get("fieldOcrVersion") or "").strip()
        or (getattr(settings, "TICKET_VISION_FIELD_OCR_VERSION", "") or "").strip()
        or "charset-easyocr"
    )

    return {
        "yoloVersion": yolo_version,
        "fieldOcrVersion": field_ocr_version,
        "detectorStrategy": settings.TICKET_VISION_DETECTOR_STRATEGY,
        "layoutStrategy": settings.TICKET_VISION_LAYOUT_STRATEGY,
        "recognitionEngine": settings.TICKET_VISION_RECOGNITION_ENGINE or "groq",
        "yoloWeights": _file_fingerprint(yolo_path),
        "manifestPath": str(manifest_path.name) if manifest_path.is_file() else None,
        "notes": file_manifest.get("notes"),
        "trainedOn": file_manifest.get("trainedOn"),
        "datasetVersion": file_manifest.get("datasetVersion"),
    }
