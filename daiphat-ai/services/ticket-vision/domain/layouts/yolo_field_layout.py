import numpy as np

from domain.detection import yolo_model
from domain.detection.yolo_obb_detector import to_numpy
from domain.layouts.base import TicketLayoutStrategy
from domain.layouts.generic_layout import GenericLayoutStrategy
from infra.logger import logger

# Region-name prefix marking a crop that is known to contain exactly one
# field. TicketParser binds these straight to that field instead of guessing
# from token shape and position (see its FIELD_REGION_PREFIX handling).
FIELD_REGION_PREFIX = "field:"

# Model class name -> the ExtractedTicketFields attribute it holds. Classes
# with no field equivalent (Lottery-ticket itself, Lottery-QR-Scan,
# drawDays, the station logo) are deliberately absent: cropping them would
# spend an OCR call on text nothing consumes.
DEFAULT_CLASS_TO_FIELD: dict[str, str] = {
    "lottery-station": "stationName",
    "lottery-ticket-serial": "serialNumber",
    "lotterynumber": "numbers",
    "drawdate": "drawDate",
    "price": "ticketType",
}

# Grown around each field box before OCR: the trained boxes hug the glyphs
# tightly, and OCR text detectors do better with a little quiet space than
# with characters flush against the crop edge.
_FIELD_PADDING_RATIO = 0.08


class YoloFieldLayoutStrategy(TicketLayoutStrategy):
    """Layout driven by the YOLO model's per-field classes.

    GenericLayoutStrategy splits a ticket into header/body at a fixed 30/70
    ratio that its own docstring admits is uncalibrated guesswork -- and
    Vietnam's ~40 station designs don't share one layout, so no single ratio
    can be right for all of them. The same weights that find tickets also
    box the fields inside them (station, serial, drawDate, lotteryNumber,
    price), which is exactly the per-station calibration that ratio was
    standing in for.

    Always returns the whole crop alongside the field crops. Two reasons:
    the parser's positional heuristics (serial sits low, station sits high)
    need a full-ticket view to stay meaningful, and a ticket whose fields
    the model misses still parses exactly as well as it does today. This
    strategy can only add information, never remove it.

    Cost: one extra inference per ticket, on the rectified crop rather than
    the source photo. Running on the crop (post-warp, post-orientation) is
    what keeps this simple -- reusing the field boxes from the detector's
    original full-image pass would avoid the second inference but would mean
    mapping every box through the perspective warp, the upscale and the
    orientation rotation. Worth doing if scan latency becomes a problem.
    """

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float,
        iou_threshold: float,
        device: str,
        class_to_field: dict[str, str] | None = None,
    ) -> None:
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.device = device
        self.class_to_field = class_to_field or DEFAULT_CLASS_TO_FIELD
        self._fallback = GenericLayoutStrategy()

    def get_regions(self, ocr_ready_crop: np.ndarray) -> dict[str, np.ndarray]:
        regions: dict[str, np.ndarray] = {"whole": ocr_ready_crop}

        try:
            prediction = yolo_model.load_model(self.model_path).predict(
                ocr_ready_crop,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                device=self.device,
                verbose=False,
            )[0]
        except Exception:  # noqa: BLE001 -- layout is best-effort; never fail a scan over it
            logger.exception("YOLO field layout failed; falling back to the generic header/body split")
            return self._fallback.get_regions(ocr_ready_crop)

        obb = getattr(prediction, "obb", None)
        names = dict(getattr(prediction, "names", None) or {})
        if obb is None or len(obb) == 0 or not names:
            return {**regions, **self._fallback.get_regions(ocr_ready_crop)}

        boxes = to_numpy(obb.xyxy)
        classes = to_numpy(obb.cls).tolist()
        confidences = to_numpy(obb.conf).tolist() if getattr(obb, "conf", None) is not None else [1.0] * len(boxes)

        # Keep only the highest-confidence box per field: a field printed
        # twice on the ticket (the lottery number often is) would otherwise
        # produce competing crops for the same slot.
        best_by_field: dict[str, tuple[float, np.ndarray]] = {}
        for box, class_id, confidence in zip(boxes, classes, confidences):
            field_name = self.class_to_field.get(str(names.get(int(class_id), "")).strip().lower())
            if field_name is None:
                continue
            if field_name not in best_by_field or confidence > best_by_field[field_name][0]:
                best_by_field[field_name] = (float(confidence), box)

        height, width = ocr_ready_crop.shape[:2]
        for field_name, (_, box) in best_by_field.items():
            crop = _padded_crop(ocr_ready_crop, box, height, width)
            if crop is not None:
                regions[f"{FIELD_REGION_PREFIX}{field_name}"] = crop

        if len(regions) == 1:
            # Nothing usable found -- behave exactly like the generic layout.
            return {**regions, **self._fallback.get_regions(ocr_ready_crop)}

        return regions


def _padded_crop(image: np.ndarray, box: np.ndarray, height: int, width: int) -> np.ndarray | None:
    x1, y1, x2, y2 = (float(v) for v in box)
    pad_x = (x2 - x1) * _FIELD_PADDING_RATIO
    pad_y = (y2 - y1) * _FIELD_PADDING_RATIO

    x1 = max(int(round(x1 - pad_x)), 0)
    y1 = max(int(round(y1 - pad_y)), 0)
    x2 = min(int(round(x2 + pad_x)), width)
    y2 = min(int(round(y2 + pad_y)), height)

    if x2 - x1 < 2 or y2 - y1 < 2:
        return None
    return image[y1:y2, x1:x2]
