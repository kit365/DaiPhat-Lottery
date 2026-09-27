"""Paper edges of a ticket around a rough outline, and boxes relative to them.

The template ``ticketFrame`` is hand-drawn on the sample photo (usually with
some desk margin) and the YOLO ticket box on an upload is approximate. Field
boxes placed relative to either outline shift by the difference between the
two, so both are snapped to the actual paper edges with the same routine.
Purely geometric: OCR output never moves a field box.
"""

from __future__ import annotations

import cv2
import numpy as np

from domain.detection.ordering import order_corners

Quad = list[tuple[float, float]]

_UNIT_SQUARE = np.float32([[0, 0], [1, 0], [1, 1], [0, 1]])
_MIN_OUTLINE_PX = 32
# Accept a snapped outline only when it stays close to the rough one: the
# rough outline already frames the paper, it is just loose or approximate.
_MIN_AREA_RATIO = 0.6
_MAX_AREA_RATIO = 1.15
_MAX_CORNER_SHIFT = 0.20
# GrabCut learns the desk from pixels outside the rough outline; without
# enough of them (ticket fills the photo) or on a flat patch it degenerates.
_MIN_BACKGROUND_SHARE = 0.03
_MIN_PIXEL_STD = 4.0


def _quad_area(quad: np.ndarray) -> float:
    return float(abs(cv2.contourArea(quad.reshape(-1, 1, 2).astype(np.float32))))


def refine_paper_quad(
    image: np.ndarray,
    rough_quad: Quad,
    *,
    search_margin: float = 0.06,
    max_side: int = 640,
) -> Quad | None:
    """Paper outline (TL, TR, BR, BL) near ``rough_quad``, in ``image`` pixels.

    GrabCut separates the ticket from the desk inside the rough box; the
    largest foreground blob is reduced to four corners. Returns None when the
    result is implausible, so callers keep the rough outline.
    """
    if image is None or image.size == 0 or not rough_quad or len(rough_quad) != 4:
        return None
    height, width = image.shape[:2]
    rough = np.asarray(rough_quad, dtype=np.float32).reshape(4, 2)
    x0, y0 = rough.min(axis=0)
    x1, y1 = rough.max(axis=0)
    box_w, box_h = float(x1 - x0), float(y1 - y0)
    if box_w < _MIN_OUTLINE_PX or box_h < _MIN_OUTLINE_PX:
        return None

    rx0 = int(max(0, np.floor(x0 - box_w * search_margin)))
    ry0 = int(max(0, np.floor(y0 - box_h * search_margin)))
    rx1 = int(min(width, np.ceil(x1 + box_w * search_margin)))
    ry1 = int(min(height, np.ceil(y1 + box_h * search_margin)))
    roi = image[ry0:ry1, rx0:rx1]
    if roi.size == 0:
        return None
    if roi.ndim == 2:
        roi = cv2.cvtColor(roi, cv2.COLOR_GRAY2BGR)
    scale = min(1.0, max_side / float(max(roi.shape[:2])))
    small = (
        cv2.resize(roi, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        if scale < 1.0
        else roi.copy()
    )
    sh, sw = small.shape[:2]
    # GrabCut needs background samples outside the rect.
    gx0 = int(np.clip((x0 - rx0) * scale, 1, sw - 3))
    gy0 = int(np.clip((y0 - ry0) * scale, 1, sh - 3))
    gx1 = int(np.clip((x1 - rx0) * scale, gx0 + 2, sw - 1))
    gy1 = int(np.clip((y1 - ry0) * scale, gy0 + 2, sh - 1))
    if (gx1 - gx0) * (gy1 - gy0) > (1.0 - _MIN_BACKGROUND_SHARE) * sw * sh:
        return None
    if float(small.std()) < _MIN_PIXEL_STD:
        return None

    mask = np.zeros((sh, sw), dtype=np.uint8)
    bgd_model = np.zeros((1, 65), dtype=np.float64)
    fgd_model = np.zeros((1, 65), dtype=np.float64)
    try:
        cv2.grabCut(
            small, mask, (gx0, gy0, gx1 - gx0, gy1 - gy0), bgd_model, fgd_model, 4,
            cv2.GC_INIT_WITH_RECT,
        )
    except cv2.error:
        return None
    foreground = np.where(
        (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0
    ).astype(np.uint8)
    kernel_size = max(3, int(round(min(sw, sh) * 0.015)) | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_OPEN, kernel)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(foreground, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    blob = max(contours, key=cv2.contourArea)
    hull = cv2.convexHull(blob)
    approx = cv2.approxPolyDP(hull, 0.02 * cv2.arcLength(hull, True), True)
    corners = approx.reshape(-1, 2) if len(approx) == 4 else cv2.boxPoints(cv2.minAreaRect(hull))
    corners = corners.astype(np.float32) / scale + np.float32([rx0, ry0])
    snapped = np.float32(order_corners(corners))

    rough_ordered = np.float32(order_corners(rough))
    area_ratio = _quad_area(snapped) / max(_quad_area(rough_ordered), 1.0)
    if not (_MIN_AREA_RATIO <= area_ratio <= _MAX_AREA_RATIO):
        return None
    shift = np.abs(snapped - rough_ordered) / np.float32([box_w, box_h])
    if float(shift.max()) > _MAX_CORNER_SHIFT:
        return None
    return [(float(x), float(y)) for x, y in snapped]


def box_relative_to_quad(
    quad: Quad, x: float, y: float, w: float, h: float
) -> tuple[float, float, float, float]:
    """Axis-aligned box (same space as ``quad``) → 0..1 coords of the rectified quad."""
    matrix = cv2.getPerspectiveTransform(np.float32(quad), _UNIT_SQUARE)
    corners = np.float32([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]).reshape(-1, 1, 2)
    mapped = cv2.perspectiveTransform(corners, matrix).reshape(-1, 2)
    mx0, my0 = mapped.min(axis=0)
    mx1, my1 = mapped.max(axis=0)
    return float(mx0), float(my0), float(mx1 - mx0), float(my1 - my0)
