from domain.detection.base import TicketDetectorStrategy
from domain.detection.contour_detector import ContourTicketDetector
from infra.config import settings

MVP_STRATEGY = "contour"
# PRODUCTION_STRATEGY = "yolov8"  # Phase 2 (see daiphat-ai/README.md roadmap):
#   a fine-tuned YOLOv8 model for Vietnamese lottery tickets. Add a
#   YoloTicketDetector(TicketDetectorStrategy) in this package and register
#   it below -- callers depend only on TicketDetectorStrategy, so no other
#   code changes.


class TicketDetectorFactory:
    """Factory Pattern: pick a detector strategy by name.

    Defaults to the MVP contour-based detector. Unknown/unavailable
    strategy names fall back to the MVP detector rather than failing the
    request -- detection quality degrading gracefully is preferable to a
    scan request erroring out.
    """

    @staticmethod
    def create(strategy: str = MVP_STRATEGY) -> TicketDetectorStrategy:
        if strategy == MVP_STRATEGY:
            return ContourTicketDetector(
                min_aspect_ratio=settings.TICKET_VISION_MIN_TICKET_ASPECT_RATIO,
                max_aspect_ratio=settings.TICKET_VISION_MAX_TICKET_ASPECT_RATIO,
                min_area_ratio=settings.TICKET_VISION_MIN_TICKET_AREA_RATIO,
                max_tickets=settings.TICKET_VISION_MAX_TICKETS_PER_IMAGE,
            )

        # Unknown strategy (e.g. "yolov8" requested before it's implemented):
        # degrade gracefully to the MVP detector instead of raising.
        return ContourTicketDetector(
            min_aspect_ratio=settings.TICKET_VISION_MIN_TICKET_ASPECT_RATIO,
            max_aspect_ratio=settings.TICKET_VISION_MAX_TICKET_ASPECT_RATIO,
            min_area_ratio=settings.TICKET_VISION_MIN_TICKET_AREA_RATIO,
            max_tickets=settings.TICKET_VISION_MAX_TICKETS_PER_IMAGE,
        )
