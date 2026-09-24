"""PaddleOCR — single place for OCR model calls."""

from __future__ import annotations

import logging
import os
import threading
import time
import re
from typing import Any, Optional

# Cấu hình môi trường
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "True"

import cv2
import numpy as np
from paddleocr import PaddleOCR

from app.core.config import settings
from app.utils.id_parser import parse_id_fields
from app.utils.image_decode import decode_bgr

_log = logging.getLogger(__name__)
_lock = threading.Lock()
_ocr: Optional[PaddleOCR] = None


def _get_ocr() -> PaddleOCR:
    global _ocr
    with _lock:
        if _ocr is None:
            t_ctor = time.perf_counter()
            _log.info("OCR trace: Khởi tạo PaddleOCR Engine (vi)...")
            _ocr = PaddleOCR(
                use_angle_cls=True,
                lang="vi",
                show_log=False,
                enable_mkldnn=False,
            )
            _log.info("OCR trace: Engine ready in %.2fs", time.perf_counter() - t_ctor)
        return _ocr


def _downscale_for_ocr(img: np.ndarray, max_side: int) -> np.ndarray:
    if max_side <= 0: return img
    h, w = img.shape[:2]
    m = max(h, w)
    if m <= max_side: return img
    scale = max_side / m
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def is_valid_cccd(full_text: str) -> bool:
    """
    Xác nhận ảnh có phải CCCD/CMND không. 
    Dùng Regex linh hoạt để chấp nhận OCR sai chính tả, dấu lạ ('), hoặc dính chữ.
    """
    text_upper = full_text.upper()
    
    # 1. Bộ từ khóa linh hoạt (cho phép có ký tự đặc biệt kẹp giữa)
    patterns = [
        r"CAN\s*CU",       # Căn cước (thường dính dấu ' hoặc mất dấu)
        r"CHUNG\s*MINH",   # Chứng minh
        r"IDENTITY",       # Identity card
        r"REPUBLIC",       # Socialist Republic
        r"VIET\s*NAM",     # Việt Nam
        r"DOC\s*LAP",      # Độc lập
        r"CANH\s*SAT",     # Cục cảnh sát (Mặt sau)
        r"IDENTIFICATION"  # Identification (Mặt sau)
    ]
    
    # Kiểm tra từ khóa
    has_keyword = any(re.search(p, text_upper) for p in patterns)
    
    # 2. Kiểm tra dãy số (CCCD 12 số hoặc CMND 9 số)
    # Không dùng \b cứng nhắc vì có thể dính chữ 'No.' hoặc 'S/'
    has_id_number = bool(re.search(r"\d{12}|\d{9}", text_upper))
    
    # 3. Kiểm tra dòng MRZ đặc trưng của mặt sau (Dạng <<<<<<<<)
    has_mrz = "<<" in text_upper
    
    # Chỉ cần trúng từ khóa + (có số định danh HOẶC là mặt sau có MRZ) là OK
    return has_keyword and (has_id_number or has_mrz)


def run_ocr(image_bytes: bytes) -> dict[str, Any]:
    t_total = time.perf_counter()
    
    # Decode & Downscale
    img = decode_bgr(image_bytes)
    img = _downscale_for_ocr(img, settings.ocr_max_side)

    # Lấy Engine
    ocr = _get_ocr()

    # Inference
    result = ocr.ocr(img, cls=True)

    lines: list[tuple[str, float]] = []
    if result and result[0]:
        for line in result[0]:
            lines.append((str(line[1][0]), float(line[1][1])))

    full_text = "\n".join(t for t, _ in lines)
    
    # --- IF/ELSE CONFIRM CCCD ---
    if not is_valid_cccd(full_text):
        _log.warning("OCR Validation Failed: Khong phai CCCD hop le.")
        return {
            "is_valid": False,
            "error": "Not a valid ID card",
            "message": "Ảnh không phải mặt trước/sau CCCD hoặc quá mờ. Vui lòng chụp lại.",
            "full_text": full_text
        }

    # Nếu OK thì tiếp tục parse
    fields = parse_id_fields(full_text, lines)
    avg_conf = sum(c for _, c in lines) / len(lines) if lines else 0.0

    return {
        "is_valid": True,
        "full_text": full_text,
        "fields": fields,
        "confidence_avg": round(avg_conf, 4),
    }