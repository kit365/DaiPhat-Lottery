import cv2
import numpy as np

from domain.detection.base import DetectedRegion, DetectionResult, TicketDetectorStrategy


def _order_corners(points: np.ndarray) -> list[tuple[int, int]]:
    """Order 4 points as (top-left, top-right, bottom-right, bottom-left).

    Standard trick: top-left has the smallest (x+y), bottom-right the
    largest (x+y); top-right has the smallest (y-x), bottom-left the
    largest (y-x).
    """
    pts = points.reshape(4, 2).astype("float32")
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).reshape(-1)

    top_left = pts[np.argmin(s)]
    bottom_right = pts[np.argmax(s)]
    top_right = pts[np.argmin(d)]
    bottom_left = pts[np.argmax(d)]

    return [
        (int(top_left[0]), int(top_left[1])),
        (int(top_right[0]), int(top_right[1])),
        (int(bottom_right[0]), int(bottom_right[1])),
        (int(bottom_left[0]), int(bottom_left[1])),
    ]


class ContourTicketDetector(TicketDetectorStrategy):
    """MVP ticket detector: OpenCV contour detection + aspect-ratio filtering.

    Pipeline: grayscale -> blur -> adaptive threshold -> external contours ->
    keep near-quadrilateral contours whose area and aspect ratio fall inside
    a configured "looks like a lottery ticket" band.

    Known limitation (see doc section 9): tickets that touch/overlap in the
    photo can merge into a single contour and get dropped or mis-boxed.
    That is exactly the case a future YoloTicketDetector is meant to fix --
    this class only needs to satisfy the TicketDetectorStrategy interface
    for that swap to be a one-line change in TicketDetectorFactory.
    """

    def __init__(
        self,
        min_aspect_ratio: float,
        max_aspect_ratio: float,
        min_area_ratio: float,
        max_tickets: int,
    ) -> None:
        self.min_aspect_ratio = min_aspect_ratio
        self.max_aspect_ratio = max_aspect_ratio
        self.min_area_ratio = min_area_ratio
        self.max_tickets = max_tickets

    def detect(self, image: np.ndarray) -> DetectionResult:
        height, width = image.shape[:2]
        image_area = float(height * width)

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(
            blurred,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            35,
            10,
        )
        # Close small gaps so a ticket's border forms one continuous contour.
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidates: list[DetectedRegion] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area <= 0 or area / image_area < self.min_area_ratio:
                continue

            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)

            if len(approx) == 4:
                quad = approx
            else:
                # Not a clean quadrilateral (rounded corners, noisy edge) --
                # fall back to the minimum bounding rectangle, which still
                # gives us a usable 4-point perspective source.
                rect = cv2.minAreaRect(contour)
                quad = cv2.boxPoints(rect).astype(np.int32)

            x, y, w, h = cv2.boundingRect(quad)
            if w == 0 or h == 0:
                continue

            aspect_ratio = min(w, h) / max(w, h)
            if not (self.min_aspect_ratio <= aspect_ratio <= self.max_aspect_ratio):
                continue

            candidates.append(
                DetectedRegion(bbox=(x, y, w, h), corners=_order_corners(quad))
            )

        # Reading order: top-to-bottom, then left-to-right within a "row".
        # Tickets fanned out at roughly the same height are grouped using
        # the median ticket height as the row-bucket size.
        if candidates:
            median_h = float(np.median([r.bbox[3] for r in candidates])) or 1.0
            candidates.sort(key=lambda r: (round(r.bbox[1] / median_h), r.bbox[0]))

        warnings: list[str] = []
        if len(candidates) > self.max_tickets:
            warnings.append(
                f"Detected {len(candidates)} candidate ticket regions; "
                f"processing capped at {self.max_tickets} "
                "(see TICKET_VISION_MAX_TICKETS_PER_IMAGE)."
            )
            candidates = candidates[: self.max_tickets]

        return DetectionResult(regions=candidates, warnings=warnings)
