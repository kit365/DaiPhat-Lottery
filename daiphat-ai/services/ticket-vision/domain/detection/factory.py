from pathlib import Path

from domain.detection.base import TicketDetectorStrategy
from domain.detection.contour_detector import ContourTicketDetector
from domain.detection.yolo_obb_detector import YoloObbTicketDetector
from infra.config import settings
from infra.logger import logger

MVP_STRATEGY = "contour"
PRODUCTION_STRATEGY = "yolov8_obb"

# services/ticket-vision/ -- this file is domain/detection/factory.py.
_SERVICE_ROOT = Path(__file__).resolve().parents[2]

# Process-wide singleton: the detector holds a lazily-loaded YOLO model, and
# re-creating it per request would reload the weights on every scan. Mirrors
# domain/ocr/factory.py's module-level strategy instances.
_yolo_detector: YoloObbTicketDetector | None = None


def resolve_model_path(configured_path: str) -> str:
    """Resolve the weights path against the service directory.

    TICKET_VISION_YOLO_MODEL_PATH is written relative to
    services/ticket-vision/ (e.g. "models/best.pt"), but the process's
    working directory is the daiphat-ai root under both
    scripts/run_ticket_vision.sh and the Dockerfile -- so a bare relative
    path would miss. Absolute paths are passed through untouched.
    """
    path = Path(configured_path)
    return str(path if path.is_absolute() else _SERVICE_ROOT / path)


class TicketDetectorFactory:
    """Factory Pattern: pick a detector strategy by name.

    Resolution order: an explicit per-request strategy (ScanMetadata's
    `detectorStrategy`) wins, then TICKET_VISION_DETECTOR_STRATEGY. Unknown
    or unavailable strategies fall back to the MVP contour detector rather
    than failing the request -- detection quality degrading gracefully is
    preferable to a scan erroring out, and it means a deployment that forgot
    to mount the weights still scans (just less accurately) instead of
    500-ing on every request.
    """

    @staticmethod
    def create(strategy: str | None = None, max_tickets: int | None = None) -> TicketDetectorStrategy:
        global _yolo_detector

        resolved_strategy = strategy or settings.TICKET_VISION_DETECTOR_STRATEGY
        resolved_max_tickets = max_tickets or settings.TICKET_VISION_MAX_TICKETS_PER_IMAGE

        if resolved_strategy == PRODUCTION_STRATEGY:
            model_path = resolve_model_path(settings.TICKET_VISION_YOLO_MODEL_PATH)
            if YoloObbTicketDetector.is_available(model_path):
                if _yolo_detector is None or _yolo_detector.model_path != model_path:
                    _yolo_detector = YoloObbTicketDetector(
                        model_path=model_path,
                        confidence_threshold=settings.TICKET_VISION_YOLO_CONFIDENCE_THRESHOLD,
                        iou_threshold=settings.TICKET_VISION_YOLO_IOU_THRESHOLD,
                        device=settings.TICKET_VISION_YOLO_DEVICE,
                        max_tickets=resolved_max_tickets,
                        ticket_class=settings.TICKET_VISION_YOLO_TICKET_CLASS,
                    )
                _yolo_detector.max_tickets = resolved_max_tickets
                return _yolo_detector

            logger.warning(
                "Falling back to '%s' detection: '%s' requested but its weights/deps are unavailable.",
                MVP_STRATEGY,
                PRODUCTION_STRATEGY,
            )
        elif resolved_strategy != MVP_STRATEGY:
            logger.warning(
                "Unknown detector strategy '%s'; falling back to '%s'.",
                resolved_strategy,
                MVP_STRATEGY,
            )

        return ContourTicketDetector(
            min_aspect_ratio=settings.TICKET_VISION_MIN_TICKET_ASPECT_RATIO,
            max_aspect_ratio=settings.TICKET_VISION_MAX_TICKET_ASPECT_RATIO,
            min_area_ratio=settings.TICKET_VISION_MIN_TICKET_AREA_RATIO,
            max_tickets=resolved_max_tickets,
        )
