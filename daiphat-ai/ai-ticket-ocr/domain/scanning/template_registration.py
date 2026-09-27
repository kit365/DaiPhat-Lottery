"""Place a station template's sample photo onto an uploaded ticket photo.

Admin draws field boxes on the template sample photo. Tickets of one issuer
share the printed design (banner, logo, denomination ovals, frame art), so
local image features matched between the sample ticket and the uploaded
ticket give a homography from sample-photo pixels to upload pixels. Field
boxes are projected through it unchanged: the template stays the source of
truth, the homography only says where that ticket lies in the upload.

YOLO supplies the rough ticket location that bounds the search.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

Quad = list[tuple[float, float]]

_MATCH_MAX_SIDE = 1000
_ROI_PAD = 0.08
_MAX_FEATURES = 4000
_RATIO_TEST = 0.75
_MIN_GOOD_MATCHES = 20
_MIN_INLIERS = 20
_MIN_INLIER_SHARE = 0.2
# RANSAC reprojection tolerance as a share of the search-area diagonal.
_RANSAC_TOLERANCE = 0.006
# The projected sample ticket must roughly coincide with the YOLO ticket.
_MIN_AREA_RATIO = 0.45
_MAX_AREA_RATIO = 2.0
_MAX_CORNER_OVERSHOOT = 0.30


@dataclass(frozen=True)
class SampleFeatures:
    """SIFT features of the ticket on a template sample photo (photo pixels)."""

    points: np.ndarray
    descriptors: np.ndarray
    ticket_quad: np.ndarray
    photo_width: int
    photo_height: int


def _gray(image: np.ndarray) -> np.ndarray:
    gray = image if image.ndim == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)


def _features_in_box(
    image: np.ndarray, x0: float, y0: float, x1: float, y1: float
) -> tuple[np.ndarray, np.ndarray] | None:
    """SIFT keypoints (image pixels) and descriptors inside a padded box."""
    height, width = image.shape[:2]
    pad_x, pad_y = (x1 - x0) * _ROI_PAD, (y1 - y0) * _ROI_PAD
    rx0, ry0 = int(max(0, x0 - pad_x)), int(max(0, y0 - pad_y))
    rx1, ry1 = int(min(width, x1 + pad_x)), int(min(height, y1 + pad_y))
    roi = image[ry0:ry1, rx0:rx1]
    if roi.size == 0 or min(roi.shape[:2]) < 32:
        return None
    scale = min(1.0, _MATCH_MAX_SIDE / float(max(roi.shape[:2])))
    if scale < 1.0:
        roi = cv2.resize(roi, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    keypoints, descriptors = cv2.SIFT_create(nfeatures=_MAX_FEATURES).detectAndCompute(
        _gray(roi), None
    )
    if descriptors is None or len(keypoints) < _MIN_GOOD_MATCHES:
        return None
    points = np.float32([kp.pt for kp in keypoints]) / scale + np.float32([rx0, ry0])
    return points, descriptors


def sample_features(sample: np.ndarray, ticket_box: tuple[float, float, float, float]) -> SampleFeatures | None:
    """Features of the ticket framed by ``ticket_box`` (normalized x, y, w, h) on the sample."""
    if sample is None or sample.size == 0:
        return None
    height, width = sample.shape[:2]
    x, y, w, h = ticket_box
    x0, y0, x1, y1 = x * width, y * height, (x + w) * width, (y + h) * height
    found = _features_in_box(sample, x0, y0, x1, y1)
    if found is None:
        return None
    points, descriptors = found
    quad = np.float32([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])
    return SampleFeatures(points, descriptors, quad, width, height)


def _quad_area(quad: np.ndarray) -> float:
    return float(abs(cv2.contourArea(quad.reshape(-1, 1, 2).astype(np.float32))))


def register(
    sample: SampleFeatures, upload: np.ndarray, ticket_quad: Quad
) -> np.ndarray | None:
    """Homography: sample-photo pixels → ``upload`` pixels, or None if unreliable.

    ``ticket_quad`` is the detected ticket in ``upload`` pixels; matching is
    restricted to it and the result must land on it.
    """
    if upload is None or upload.size == 0 or not ticket_quad or len(ticket_quad) != 4:
        return None
    rough = np.float32(ticket_quad).reshape(4, 2)
    x0, y0 = rough.min(axis=0)
    x1, y1 = rough.max(axis=0)
    found = _features_in_box(upload, float(x0), float(y0), float(x1), float(y1))
    if found is None:
        return None
    points, descriptors = found

    pairs = cv2.BFMatcher(cv2.NORM_L2).knnMatch(sample.descriptors, descriptors, k=2)
    good = [p[0] for p in pairs if len(p) == 2 and p[0].distance < _RATIO_TEST * p[1].distance]
    if len(good) < _MIN_GOOD_MATCHES:
        return None
    src = np.float32([sample.points[m.queryIdx] for m in good]).reshape(-1, 1, 2)
    dst = np.float32([points[m.trainIdx] for m in good]).reshape(-1, 1, 2)
    tolerance = max(2.0, _RANSAC_TOLERANCE * float(np.hypot(x1 - x0, y1 - y0)))
    matrix, mask = cv2.findHomography(src, dst, cv2.RANSAC, tolerance)
    if matrix is None or mask is None:
        return None
    inliers = int(mask.sum())
    if inliers < _MIN_INLIERS or inliers < _MIN_INLIER_SHARE * len(good):
        return None

    projected = cv2.perspectiveTransform(sample.ticket_quad.reshape(-1, 1, 2), matrix).reshape(4, 2)
    if not np.all(np.isfinite(projected)):
        return None
    if not cv2.isContourConvex(projected.reshape(-1, 1, 2).astype(np.float32)):
        return None
    area_ratio = _quad_area(projected) / max(_quad_area(rough), 1.0)
    if not (_MIN_AREA_RATIO <= area_ratio <= _MAX_AREA_RATIO):
        return None
    span = np.float32([x1 - x0, y1 - y0])
    lower = np.float32([x0, y0]) - span * _MAX_CORNER_OVERSHOOT
    upper = np.float32([x1, y1]) + span * _MAX_CORNER_OVERSHOOT
    if np.any(projected < lower) or np.any(projected > upper):
        return None
    return matrix


def project(matrix: np.ndarray, points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    mapped = cv2.perspectiveTransform(np.float32(points).reshape(-1, 1, 2), matrix).reshape(-1, 2)
    return [(float(x), float(y)) for x, y in mapped]
