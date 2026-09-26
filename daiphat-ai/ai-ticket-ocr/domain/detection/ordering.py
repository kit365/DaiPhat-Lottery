"""Post-detection steps every TicketDetectorStrategy must apply identically.

Corner ordering, reading order and the max-tickets cap are not specific to
*how* tickets were found, and they must not drift between strategies: the
ticket index in a ScanResponse is what the mobile app keys its overlay and
its per-ticket edits off, so the same photo has to yield the same ordering
whether it went through contours or YOLO.
"""

import numpy as np

from domain.detection.base import DetectedRegion


def order_corners(points: np.ndarray) -> list[tuple[int, int]]:
    """Order 4 points as (top-left, top-right, bottom-right, bottom-left).

    Standard trick: top-left has the smallest (x+y), bottom-right the
    largest (x+y); top-right has the smallest (y-x), bottom-left the
    largest (y-x).

    Needed by every detector, not just the contour one: a YOLO-OBB box's
    own point order follows the box's rotation, so feeding it straight into
    the perspective warp would produce rotated or mirrored crops.
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


def sort_reading_order(regions: list[DetectedRegion]) -> list[DetectedRegion]:
    """Sort top-to-bottom, then left-to-right within a "row".

    Tickets fanned out at roughly the same height are grouped using the
    median ticket height as the row-bucket size.
    """
    if not regions:
        return regions

    median_h = float(np.median([r.bbox[3] for r in regions])) or 1.0
    return sorted(regions, key=lambda r: (round(r.bbox[1] / median_h), r.bbox[0]))


def cap_to_max_tickets(
    regions: list[DetectedRegion], max_tickets: int
) -> tuple[list[DetectedRegion], list[str]]:
    """Trim to max_tickets, returning the kept regions and any warning."""
    if len(regions) <= max_tickets:
        return regions, []

    warning = (
        f"Detected {len(regions)} candidate ticket regions; "
        f"processing capped at {max_tickets} "
        "(see TICKET_VISION_MAX_TICKETS_PER_IMAGE)."
    )
    return regions[:max_tickets], [warning]
