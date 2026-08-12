from domain.detection.factory import resolve_model_path
from domain.detection.yolo_obb_detector import YoloObbTicketDetector
from domain.layouts.base import TicketLayoutStrategy
from domain.layouts.generic_layout import GenericLayoutStrategy
from domain.layouts.yolo_field_layout import YoloFieldLayoutStrategy
from infra.config import settings
from infra.logger import logger

GENERIC_STRATEGY = "generic"
YOLO_FIELD_STRATEGY = "yolo_field"

# Factory Pattern (doc section 9): select the appropriate layout strategy by
# station_code. Register per-station strategies here as they get calibrated,
# e.g. {"HCM": HcmLayoutStrategy(), "DNG": DaNangLayoutStrategy()}.
_REGISTRY: dict[str, TicketLayoutStrategy] = {}

_generic = GenericLayoutStrategy()
_yolo_field: YoloFieldLayoutStrategy | None = None


class LayoutStrategyFactory:
    @staticmethod
    def get_for_station(station_code: str | None) -> TicketLayoutStrategy:
        if station_code and station_code in _REGISTRY:
            return _REGISTRY[station_code]

        # The YOLO field layout is station-agnostic -- it locates fields from
        # the image itself, which is exactly what a hand-calibrated
        # per-station layout would otherwise have to encode for all ~40
        # station designs. Preferred over the generic ratio split whenever
        # it's available.
        if settings.TICKET_VISION_LAYOUT_STRATEGY == YOLO_FIELD_STRATEGY:
            layout = _get_yolo_field_layout()
            if layout is not None:
                return layout

        return _generic


def _get_yolo_field_layout() -> YoloFieldLayoutStrategy | None:
    global _yolo_field

    model_path = resolve_model_path(settings.TICKET_VISION_YOLO_MODEL_PATH)
    if not YoloObbTicketDetector.is_available(model_path):
        logger.warning(
            "Layout strategy '%s' requested but the YOLO weights/deps are unavailable; using '%s'.",
            YOLO_FIELD_STRATEGY,
            GENERIC_STRATEGY,
        )
        return None

    if _yolo_field is None or _yolo_field.model_path != model_path:
        _yolo_field = YoloFieldLayoutStrategy(
            model_path=model_path,
            confidence_threshold=settings.TICKET_VISION_YOLO_FIELD_CONFIDENCE_THRESHOLD,
            iou_threshold=settings.TICKET_VISION_YOLO_IOU_THRESHOLD,
            device=settings.TICKET_VISION_YOLO_DEVICE,
        )
    return _yolo_field
