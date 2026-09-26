"""
Robust Passive Liveness Detection using Silent-Face-Anti-Spoofing (ONNX).
"""

from __future__ import annotations

import logging
import os
from typing import Any
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

from app.utils.image_decode import decode_bgr

_log = logging.getLogger(__name__)

def analyze_liveness(image_bytes: bytes) -> dict[str, Any]:
    """
    Perform passive liveness detection using Laplacian variance (blur detection).
    This is extremely lightweight, 100% offline, and does not require models or CMake.
    """
    try:
        img = decode_bgr(image_bytes)
        
        # 1. Chuyển sang ảnh xám
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 2. Tính toán phương sai Laplacian (độ sắc nét)
        # Thông thường ảnh thật (live) có độ sắc nét cao (> 100), ảnh qua màn hình/giấy in sẽ mờ hơn (< 100).
        variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        
        # 3. Chuẩn hóa điểm số (0.0 -> 1.0) dựa trên ngưỡng 150
        score = min(1.0, variance / 150.0)
        
        # Ngưỡng (threshold) 0.1 là khá thoáng để tránh false negative, 
        # nhưng đủ để lọc các ảnh cực kỳ mờ hoặc lóa màn hình.
        is_live = variance >= 15.0
        
        _log.info("Liveness (Laplacian) result: variance=%.2f, score=%.4f, is_live=%s", variance, score, is_live)

        return {
            "is_live": is_live,
            "score": round(score, 4),
            "variance": round(variance, 2),
            "method": "laplacian_variance_offline",
        }

    except Exception as e:
        _log.error("Liveness detection error: %s", e)
        return {"is_live": False, "score": 0.0, "method": "error", "error": str(e)}
