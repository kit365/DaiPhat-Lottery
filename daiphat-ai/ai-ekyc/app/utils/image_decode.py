"""Decode upload bytes to BGR ndarray for OpenCV (JPG/PNG/WebP/HEIC via Pillow + pillow-heif)."""

from __future__ import annotations

import io
import logging

import cv2
import numpy as np

_log = logging.getLogger(__name__)

# Cho phép Pillow đọc ảnh HEIC (iPhone). Phải gọi trước Image.open(...).
try:
    import pillow_heif

    pillow_heif.register_heif_opener()
    _HEIF = True
except ImportError:
    _HEIF = False
    _log.warning("pillow-heif not installed — HEIC/iPhone photos may fail. pip install pillow-heif")


def decode_bgr(image_bytes: bytes) -> np.ndarray:
    """
    Decode → BGR. Ưu tiên Pillow + EXIF transpose (ảnh điện thoại thường xoay trong metadata;
    OpenCV imdecode không áp dụng EXIF → selfie/CCCD lệch hướng làm face verify sai).
    Fallback OpenCV nếu Pillow không đọc được.
    """
    if not image_bytes or len(image_bytes) < 10:
        raise ValueError(
            "File empty or too small. Choose a real image. "
            "iPhone: install pillow-heif or use JPG (Settings → Camera → Most Compatible)."
        )

    try:
        from PIL import Image, ImageOps

        pil = Image.open(io.BytesIO(image_bytes))
        pil = ImageOps.exif_transpose(pil)
        pil = pil.convert("RGB")
        rgb = np.array(pil)
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except Exception as pil_exc:
        _log.debug("PIL decode failed, trying OpenCV: %s", pil_exc)

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is not None:
        return img

    hint = ""
    if not _HEIF:
        hint = " Install: pip install pillow-heif (for iPhone HEIC)."
    raise ValueError(
        "Could not decode image. Use JPG/PNG, or install pillow-heif for HEIC."
        + hint
    ) from pil_exc
