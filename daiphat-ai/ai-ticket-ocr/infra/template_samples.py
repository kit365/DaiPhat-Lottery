"""Download + cache OCR template sample photos (drawn on by Admin)."""

from __future__ import annotations

import threading
import time
from collections import OrderedDict

import cv2
import httpx
import numpy as np

from infra.config import settings
from infra.logger import logger

_MAX_CACHED = 32
_MAX_SIDE = 1600
_RETRY_FAILED_AFTER_SECONDS = 300.0

_lock = threading.Lock()
_images: OrderedDict[str, np.ndarray] = OrderedDict()
_failed_at: dict[str, float] = {}


def load_sample_image(url: str | None) -> np.ndarray | None:
    """Decoded sample photo (long side ≤ 1600 px), or None when unavailable."""
    if not url:
        return None
    with _lock:
        if url in _images:
            _images.move_to_end(url)
            return _images[url]
        failed = _failed_at.get(url)
        if failed is not None and time.monotonic() - failed < _RETRY_FAILED_AFTER_SECONDS:
            return None
    try:
        timeout = float(settings.TICKET_VISION_TEMPLATE_SAMPLE_TIMEOUT_SECONDS)
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
        image = cv2.imdecode(np.frombuffer(response.content, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("not a decodable image")
    except Exception as exc:  # noqa: BLE001
        logger.warning("OCR template sample image unavailable (%s): %s", url, exc)
        with _lock:
            _failed_at[url] = time.monotonic()
        return None
    height, width = image.shape[:2]
    scale = _MAX_SIDE / float(max(height, width))
    if scale < 1.0:
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    with _lock:
        _failed_at.pop(url, None)
        _images[url] = image
        while len(_images) > _MAX_CACHED:
            _images.popitem(last=False)
    return image
