"""OCR routes."""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.api.deps import require_api_key
from app.services import ocr_service

_log = logging.getLogger(__name__)
router = APIRouter(
    prefix="/internal/v1",
    tags=["ocr"],
    dependencies=[Depends(require_api_key)],
)


@router.post(
    "/ocr/id-card",
    summary="OCR CMND/CCCD",
    response_description="JSON gồm `front` (luôn có) và `back` (null nếu không gửi mặt sau).",
)
async def ocr_id_card(
    front: UploadFile = File(
        ...,
        description=(
            "Ảnh mặt trước giấy tờ (bắt buộc). "
            "Trên Swagger UI: phải chọn file ở ô này — không chọn file sẽ trả **422**. "
            "Lần đầu PaddleOCR tải model và xử lý có thể **vài phút**; để test nhanh nên dùng JPG/PNG nhỏ. "
            "HEIC (iPhone) cần `pillow-heif` (đã có trong requirements)."
        ),
    ),
    back: Optional[UploadFile] = File(
        default=None,
        description=(
            "Ảnh mặt sau (tuỳ chọn). "
            "Trên Swagger UI: **không** bật «Send empty value» nếu không có file — chỉ upload khi có ảnh mặt sau; "
            "để trống và không tick gửi giá trị rỗng."
        ),
    ),
):
    """Đọc text từ ảnh giấy tờ; `front` luôn được OCR, `back` chỉ khi có file hợp lệ."""
    front_bytes = await front.read()
    if not front_bytes:
        raise HTTPException(status_code=400, detail="Empty front image")

    _log.info("OCR /id-card: front upload bytes=%d, starting run_id_card_ocr", len(front_bytes))
    try:
        front_result = await asyncio.to_thread(ocr_service.run_id_card_ocr, front_bytes)
        _log.info("OCR /id-card: front OCR completed")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception:
        _log.exception("OCR front failed")
        raise HTTPException(status_code=500, detail="OCR processing failed") from None

    back_result = None
    if back and back.filename:
        back_bytes = await back.read()
        if back_bytes:
            _log.info("OCR /id-card: back upload bytes=%d, starting optional OCR", len(back_bytes))
            try:
                back_result = await asyncio.to_thread(
                    ocr_service.run_id_card_ocr_optional,
                    back_bytes,
                )
                _log.info("OCR /id-card: back OCR completed")
            except Exception as e:
                _log.warning("OCR back failed: %s", e)

    return JSONResponse({"front": front_result, "back": back_result})
