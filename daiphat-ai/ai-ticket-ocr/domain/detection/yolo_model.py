"""Shared, lazily-loaded YOLO model cache.

Both the ticket detector (domain/detection/yolo_obb_detector.py) and the
field layout (domain/layouts/yolo_field_layout.py) run the same weights file
-- the model detects whole tickets *and* the fields inside them. Loading it
once and sharing the handle keeps a single copy in memory instead of two.
"""

from pathlib import Path
from threading import Lock

from infra.logger import logger

_models: dict[str, object] = {}
_lock = Lock()


class YoloWeightsUnavailableError(RuntimeError):
    """Raised when the weights file or the ultralytics package is missing.

    Callers degrade to a non-YOLO strategy rather than failing the scan.
    """


def is_available(model_path: str) -> bool:
    """Whether YOLO can actually run: weights on disk and ultralytics
    importable. Checked at wiring time so a missing model downgrades the
    strategy instead of erroring mid-scan."""
    if not Path(model_path).is_file():
        logger.warning("YOLO weights not found at %s", model_path)
        return False
    try:
        import ultralytics  # noqa: F401
    except ImportError:
        logger.warning("ultralytics is not installed; YOLO strategies unavailable")
        return False
    return True


def load_model(model_path: str):
    """Return the loaded model for model_path, loading it on first use.

    Guarded by a lock: uvicorn serves requests from a thread pool, and two
    concurrent first-scans would otherwise both pay the (slow) load.
    """
    cached = _models.get(model_path)
    if cached is not None:
        return cached

    with _lock:
        # Re-check inside the lock -- another thread may have loaded it while
        # this one waited.
        cached = _models.get(model_path)
        if cached is not None:
            return cached

        if not Path(model_path).is_file():
            raise YoloWeightsUnavailableError(f"YOLO weights not found at {model_path}")
        try:
            # Deferred import: ultralytics pulls in torch, which costs seconds
            # of import time the non-YOLO paths should never pay.
            from ultralytics import YOLO
        except ImportError as exc:
            raise YoloWeightsUnavailableError("ultralytics is not installed") from exc

        logger.info("Loading YOLO weights from %s", model_path)
        model = YOLO(model_path)
        _models[model_path] = model
        return model
