import numpy as np

from domain.detection import yolo_model
from domain.detection.base import DetectedRegion, DetectionResult, TicketDetectorStrategy
from domain.detection.ordering import cap_to_max_tickets, order_corners, sort_reading_order
from domain.detection.yolo_model import YoloWeightsUnavailableError  # noqa: F401 -- re-exported
from infra.logger import logger


def to_numpy(value) -> np.ndarray:
    """ultralytics returns torch tensors; tests hand in plain ndarrays."""
    return np.asarray(value.cpu() if hasattr(value, "cpu") else value)


_to_numpy = to_numpy


class YoloObbTicketDetector(TicketDetectorStrategy):
    """Production ticket detector: a fine-tuned YOLOv8-OBB model.

    Oriented bounding boxes are a natural fit for this pipeline: a rotated
    box *is* the four-corner quad that DetectedRegion already carries and
    that the perspective warp consumes, so unlike the contour detector
    there's no reconstructing a quad from a blob. It also fixes the contour
    detector's main failure mode (see ContourTicketDetector's docstring):
    tickets that touch or overlap in the photo merge into one contour, while
    YOLO scores each ticket independently.

    The model is loaded lazily and kept for the process's lifetime -- the
    same pattern the OCR strategies use. Loading weights per request would
    dominate scan latency.
    """

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float,
        iou_threshold: float,
        device: str,
        max_tickets: int,
        ticket_class: str,
    ) -> None:
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.device = device
        self.max_tickets = max_tickets
        self.ticket_class = ticket_class
        self._model = None

    @classmethod
    def is_available(cls, model_path: str) -> bool:
        """Whether this strategy can actually run: weights present on disk
        and ultralytics importable. Checked by the factory before choosing
        this detector, so a missing model degrades to contour detection at
        wiring time instead of erroring mid-scan."""
        return yolo_model.is_available(model_path)

    def _get_model(self):
        if self._model is None:
            # Shared with the field layout strategy -- same weights file.
            self._model = yolo_model.load_model(self.model_path)
        return self._model

    def _ticket_class_mask(self, obb, names) -> list[bool]:
        """Which detections are whole tickets rather than fields inside one.

        The model also detects sub-regions (station, serial, drawDate,
        lotteryNumber, price, QR, logo) — a single photo of 5 tickets yields
        ~19 boxes, so returning them unfiltered would report every field as
        its own "ticket". Those field boxes are useful, but as a per-station
        OCR layout (LayoutStrategyFactory's seam), not as tickets.

        Degrades open: if the configured class name isn't in the model's
        class list at all (a retrain renamed it), keep every detection and
        warn rather than silently returning zero tickets.
        """
        classes = getattr(obb, "cls", None)
        if classes is None or not names:
            return [True] * len(obb)

        wanted = self.ticket_class.strip().lower()
        matching_ids = {
            class_id for class_id, name in dict(names).items() if str(name).strip().lower() == wanted
        }
        if not matching_ids:
            logger.warning(
                "Ticket class %r not found in model classes %s; keeping all detections.",
                self.ticket_class,
                sorted(str(n) for n in dict(names).values()),
            )
            return [True] * len(obb)

        return [int(class_id) in matching_ids for class_id in _to_numpy(classes).tolist()]

    def detect(self, image: np.ndarray) -> DetectionResult:
        # ultralytics accepts a BGR ndarray directly -- the same array
        # decode_image/resize_if_needed already produced, so detections come
        # back in the resized source image's coordinate space, which is what
        # DetectedRegion and the mobile overlay expect.
        prediction = self._get_model().predict(
            image,
            conf=self.confidence_threshold,
            iou=self.iou_threshold,
            device=self.device,
            verbose=False,
        )[0]

        obb = getattr(prediction, "obb", None)
        if obb is None or len(obb) == 0:
            return DetectionResult(regions=[], warnings=[])

        quads = _to_numpy(obb.xyxyxyxy)
        boxes = _to_numpy(obb.xyxy)
        keep = self._ticket_class_mask(obb, getattr(prediction, "names", None))

        height, width = image.shape[:2]
        regions: list[DetectedRegion] = []
        for quad, box, is_ticket in zip(quads, boxes, keep):
            if not is_ticket:
                continue
            x1, y1, x2, y2 = (int(round(float(v))) for v in box)
            # Clamp: a box predicted slightly past the frame edge would
            # otherwise slice an empty crop out of the source array.
            x1, y1 = max(x1, 0), max(y1, 0)
            x2, y2 = min(x2, width), min(y2, height)
            if x2 - x1 <= 0 or y2 - y1 <= 0:
                continue

            regions.append(
                DetectedRegion(
                    bbox=(x1, y1, x2 - x1, y2 - y1),
                    # The OBB's own point order follows the box's rotation,
                    # not image-space TL/TR/BR/BL -- re-order it or the
                    # perspective warp yields rotated/mirrored crops.
                    corners=order_corners(np.asarray(quad, dtype="float32")),
                )
            )

        regions = sort_reading_order(regions)
        regions, warnings = cap_to_max_tickets(regions, self.max_tickets)

        return DetectionResult(regions=regions, warnings=warnings)
