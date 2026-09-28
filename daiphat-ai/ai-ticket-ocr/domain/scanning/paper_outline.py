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
# Completing a detector box may grow it (edges cut off, a ticket detected
# as two halves) or shrink it (neighbouring paper taken in), but the result
# must still be one ticket-shaped sheet.
_COMPLETE_MIN_AREA_RATIO = 0.55
_COMPLETE_MAX_AREA_RATIO = 2.4
_TICKET_MIN_ASPECT = 0.28
_TICKET_MAX_ASPECT = 0.75
# Share of the outline quad the paper blob covers: a lone sheet fills it,
# a ticket merged with touching paper leaves notches.
_SINGLE_SHEET_FILL = 0.93
_MIN_SHEET_FILL = 0.85
# Share of the search-limit band a completed sheet may touch.
_MAX_LIMIT_CONTACT = 0.10
# Completion runs that found the same sheet.
_SAME_OUTLINE_IOU = 0.9
# Share of each outline inside the other for both to be the same sheet.
_PIECE_OVERLAP = 0.6
# Share of each piece a merged sheet must hold.
_PIECE_INSIDE = 0.8
# Gap (share of an outline's size) under which two outlines count as touching.
_TOUCH_MARGIN = 0.04


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


def _side_lengths(quad: np.ndarray) -> tuple[float, float]:
    """Mean (horizontal, vertical) side length of a TL, TR, BR, BL quad."""
    tl, tr, br, bl = quad
    width = (np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2.0
    height = (np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2.0
    return float(width), float(height)


def _scale_about_centroid(quad: np.ndarray, factor: float) -> np.ndarray:
    centre = quad.mean(axis=0)
    return centre + (quad - centre) * factor


class _Outline:
    __slots__ = ("quad", "fill", "contact")

    def __init__(self, quad: np.ndarray, fill: float, contact: float) -> None:
        self.quad = quad
        self.fill = fill
        self.contact = contact

    @property
    def leaks(self) -> bool:
        return self.contact > _MAX_LIMIT_CONTACT


def _grabcut_outline(
    image: np.ndarray,
    rough: np.ndarray,
    grow: float,
    ring_label: int,
    max_side: int,
) -> _Outline | None:
    """Ticket-shaped paper blob under ``rough``'s core, searched in ``rough`` grown by ``grow``.

    GrabCut runs on the grown box plus a band of background samples around
    it; the grown ring is seeded as ``ring_label``, the rough box as probable
    ticket and its core as ticket.
    """
    height, width = image.shape[:2]
    x0, y0 = rough.min(axis=0)
    x1, y1 = rough.max(axis=0)
    box_w, box_h = float(x1 - x0), float(y1 - y0)
    reach = grow + 0.08
    rx0 = int(max(0, np.floor(x0 - box_w * reach)))
    ry0 = int(max(0, np.floor(y0 - box_h * reach)))
    rx1 = int(min(width, np.ceil(x1 + box_w * reach)))
    ry1 = int(min(height, np.ceil(y1 + box_h * reach)))
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
    if float(small.std()) < _MIN_PIXEL_STD:
        return None
    sh, sw = small.shape[:2]
    origin = np.float32([rx0, ry0])

    def to_small(quad: np.ndarray) -> np.ndarray:
        return ((quad - origin) * scale).astype(np.int32)

    grown = to_small(_scale_about_centroid(rough, 1.0 + 2.0 * grow))
    core = to_small(_scale_about_centroid(rough, 0.5))
    centre = tuple(float(v) for v in ((rough.mean(axis=0) - origin) * scale))

    mask = np.full((sh, sw), cv2.GC_BGD, dtype=np.uint8)
    cv2.fillConvexPoly(mask, grown, ring_label)
    cv2.fillConvexPoly(mask, to_small(rough), cv2.GC_PR_FGD)
    cv2.fillConvexPoly(mask, core, cv2.GC_FGD)
    if int((mask == cv2.GC_BGD).sum()) < _MIN_BACKGROUND_SHARE * sw * sh:
        return None
    bgd_model = np.zeros((1, 65), dtype=np.float64)
    fgd_model = np.zeros((1, 65), dtype=np.float64)
    try:
        cv2.grabCut(small, mask, None, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_MASK)
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
    under_core = [c for c in contours if cv2.pointPolygonTest(c, centre, False) >= 0]
    if not under_core:
        return None
    blob = max(under_core, key=cv2.contourArea)
    hull = cv2.convexHull(blob)
    approx = cv2.approxPolyDP(hull, 0.02 * cv2.arcLength(hull, True), True)
    corners = approx.reshape(-1, 2) if len(approx) == 4 else cv2.boxPoints(cv2.minAreaRect(hull))
    quad = np.float32(order_corners(corners.astype(np.float32)))
    if not cv2.isContourConvex(quad.reshape(-1, 1, 2)):
        return None
    fill = float(cv2.contourArea(blob)) / max(_quad_area(quad), 1.0)

    # A blob pressed against the search limit (grown box or photo edge) is
    # desk or hand that GrabCut could not tell apart, not a whole sheet.
    region = np.zeros((sh, sw), dtype=np.uint8)
    cv2.fillConvexPoly(region, grown, 255)
    inner = cv2.erode(region, np.ones((5, 5), np.uint8), borderType=cv2.BORDER_CONSTANT, borderValue=0)
    limit = (region > 0) & (inner == 0)
    blob_mask = np.zeros((sh, sw), dtype=np.uint8)
    cv2.drawContours(blob_mask, [blob], -1, 255, thickness=cv2.FILLED)
    touching = float(((blob_mask > 0) & limit).sum()) / max(float(limit.sum()), 1.0)

    snapped = quad / scale + origin
    area_ratio = _quad_area(snapped) / max(_quad_area(rough), 1.0)
    if not (_COMPLETE_MIN_AREA_RATIO <= area_ratio <= _COMPLETE_MAX_AREA_RATIO):
        return None
    side_w, side_h = _side_lengths(snapped)
    aspect = min(side_w, side_h) / max(side_w, side_h, 1.0)
    if not (_TICKET_MIN_ASPECT <= aspect <= _TICKET_MAX_ASPECT):
        return None
    return _Outline(snapped, fill, touching)


def complete_ticket_quad(
    image: np.ndarray,
    rough_quad: Quad,
    *,
    grows: tuple[float, ...] = (0.18, 0.3, 0.45),
    max_side: int = 256,
) -> Quad | None:
    """Whole-paper outline (TL, TR, BR, BL) of the ticket a detector box sits on.

    Detector boxes are approximate in both directions: they cut ticket edges
    off, take in neighbouring paper, or cover only part of a ticket. GrabCut
    runs in the rough box grown by each of ``grows`` (so paper the box missed
    is not forced to background), seeded with the box's core as ticket; the
    paper blob under that core is reduced to four corners. None when no result
    is a plausible single ticket, so callers keep the detector outline.
    """
    if image is None or image.size == 0 or not rough_quad or len(rough_quad) != 4:
        return None
    rough = np.float32(order_corners(np.asarray(rough_quad, dtype=np.float32)))
    x0, y0 = rough.min(axis=0)
    x1, y1 = rough.max(axis=0)
    if float(x1 - x0) < _MIN_OUTLINE_PX or float(y1 - y0) < _MIN_OUTLINE_PX:
        return None

    # Loose (grown ring seeded as probable ticket) recovers paper the box
    # missed but can swallow touching paper; tight (ring seeded as probable
    # desk) keeps touching paper out but can drop ticket print unlike the box
    # core. Each failure mode is specific to one seeding and search size,
    # while the real sheet edges come back from most runs: keep the outline
    # the plausible runs agree on.
    outlines = [
        found.quad
        for grow in grows
        for ring_label in (cv2.GC_PR_FGD, cv2.GC_PR_BGD)
        if (found := _grabcut_outline(image, rough, grow, ring_label, max_side)) is not None
        and not found.leaks
        and found.fill >= _MIN_SHEET_FILL
    ]
    if not outlines:
        return None
    agreement = np.array(
        [[quad_iou(a, b) for b in outlines] for a in outlines], dtype=np.float64
    )
    support = (agreement >= _SAME_OUTLINE_IOU).sum(axis=1) + agreement.mean(axis=1)
    chosen = outlines[int(np.argmax(support))]
    return [(float(x), float(y)) for x, y in chosen]


def _share_inside(piece: np.ndarray, outline: np.ndarray) -> float:
    inter, _ = cv2.intersectConvexConvex(piece, outline)
    return float(inter) / max(_quad_area(piece), 1.0)


def merge_ticket_quads(image: np.ndarray, quads: list[Quad]) -> list[tuple[Quad, list[int]]]:
    """Merge completed outlines that are pieces or duplicates of one sheet.

    Overlapping or touching outlines are either two tickets lying against
    each other or one ticket the detector split (a paper band unlike the rest
    stays out of each piece's completion). The box around both is completed
    again; when that yields one ticket-shaped sheet holding both, it replaces
    them. Returns (outline, indices of merged inputs), groups in order of
    their first member.
    """
    groups: list[tuple[np.ndarray, list[int]]] = [
        (np.float32(quad).reshape(4, 2), [index]) for index, quad in enumerate(quads)
    ]
    merged = True
    while merged:
        merged = False
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                a, b = groups[i][0], groups[j][0]
                near_a = np.float32(expand_quad([tuple(p) for p in a], _TOUCH_MARGIN))
                touching, _ = cv2.intersectConvexConvex(near_a, b)
                if float(touching) <= 0:
                    continue
                if min(_share_inside(a, b), _share_inside(b, a)) >= _PIECE_OVERLAP:
                    whole = a if _quad_area(a) >= _quad_area(b) else b
                else:
                    around = cv2.boxPoints(cv2.minAreaRect(np.vstack([a, b])))
                    found = complete_ticket_quad(image, [tuple(p) for p in around])
                    if found is None:
                        continue
                    whole = np.float32(found)
                    if min(_share_inside(a, whole), _share_inside(b, whole)) < _PIECE_INSIDE:
                        continue
                groups[i] = (whole, groups[i][1] + groups[j][1])
                del groups[j]
                merged = True
                break
            if merged:
                break
    return [([(float(x), float(y)) for x, y in quad], members) for quad, members in groups]


def expand_quad(quad: Quad, margin: float) -> Quad:
    """Grow a quad by ``margin`` of its own width/height on every side.

    Done in the quad's rectified frame, so the result is the same ticket with
    a uniform border: unit-square corners ``(-m, -m) .. (1 + m, 1 + m)``.
    """
    to_image = cv2.getPerspectiveTransform(_UNIT_SQUARE, np.float32(quad))
    lo, hi = -margin, 1.0 + margin
    grown = np.float32([[lo, lo], [hi, lo], [hi, hi], [lo, hi]]).reshape(-1, 1, 2)
    return [(float(x), float(y)) for x, y in cv2.perspectiveTransform(grown, to_image).reshape(-1, 2)]


def quad_iou(a: Quad, b: Quad) -> float:
    """Intersection over union of two convex quads."""
    pa = np.float32(a).reshape(-1, 2)
    pb = np.float32(b).reshape(-1, 2)
    inter, _ = cv2.intersectConvexConvex(pa, pb)
    union = _quad_area(pa) + _quad_area(pb) - float(inter)
    return float(inter) / union if union > 0 else 0.0


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
