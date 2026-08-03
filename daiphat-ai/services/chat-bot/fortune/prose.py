"""Fortune-cast prose generator — independent from chatbot fortune/dream book."""

from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from contracts.api_response import APIResponse

fortune_router = APIRouter(prefix="/fortune", tags=["Fortune"])

_ELEMENT_VI = {
    "METAL": "Kim",
    "WOOD": "Mộc",
    "WATER": "Thủy",
    "FIRE": "Hỏa",
    "EARTH": "Thổ",
}


class PreviousCast(BaseModel):
    castDate: str | None = None
    luckyTail: str | None = None
    userElement: str | None = None


class FortuneProseRequest(BaseModel):
    luckyTail: str
    userElement: str
    dayElement: str
    birthYear: int
    previousCast: PreviousCast | None = None
    fallbackUsed: bool = False
    fallbackReason: str | None = None


class FortuneProseResponse(BaseModel):
    prose: str = Field(..., description="Interpretation text only; never invent a different lucky number")


def _vi_element(value: str | None) -> str:
    if not value:
        return "Thổ"
    return _ELEMENT_VI.get(value.strip().upper(), value)


def _build_template_prose(request: FortuneProseRequest) -> str:
    parts = [
        (
            f"Hôm nay bản mệnh của bạn thuộc hành {_vi_element(request.userElement)}, "
            f"còn ngày hiện tại mang khí của hành {_vi_element(request.dayElement)}."
        ),
        (
            f"Số đuôi may mắn được chọn cho bạn là {request.luckyTail}. "
            "Hãy giữ tâm thế bình an, tin vào thời điểm của mình và để con số này dẫn lối cho lựa chọn vé."
        ),
    ]
    if request.fallbackUsed:
        parts.append(
            "Số đuôi ưu tiên ban đầu đã hết hàng, nên hệ thống đã chọn một đuôi "
            "cùng nhóm ngũ hành gần nhất còn trong kho."
        )
    if request.previousCast and request.previousCast.luckyTail:
        parts.append(
            f"So với lần gieo ngày {request.previousCast.castDate} "
            f"(đuôi {request.previousCast.luckyTail}), lời quẻ hôm nay mở ra một chương mới."
        )
    parts.append("Chúc bạn may mắn và tài lộc.")
    return " ".join(parts)


def _try_llm_prose(request: FortuneProseRequest) -> str | None:
    """Optional LLM hook. Returns None when disabled or on failure so Java/template can fall back."""
    api_key = os.getenv("FORTUNE_LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        prompt = (
            "Viết lời luận giải gieo quẻ ngắn, khích lệ, bằng tiếng Việt tự nhiên. "
            f"CHỈ được bàn về số đuôi may mắn {request.luckyTail}. "
            "Không được bịa hay gợi ý số khác. "
            f"Bản mệnh: {_vi_element(request.userElement)}. "
            f"Hành ngày: {_vi_element(request.dayElement)}. "
            f"Năm sinh: {request.birthYear}."
        )
        _ = prompt  # reserved for LLM call
        return None
    except Exception:
        return None


@fortune_router.post("/cast/prose", response_model=APIResponse)
def generate_fortune_prose(request: FortuneProseRequest) -> Any:
    try:
        prose = _try_llm_prose(request) or _build_template_prose(request)
        if request.luckyTail not in prose:
            prose = _build_template_prose(request)
        return APIResponse.ok(data=FortuneProseResponse(prose=prose).model_dump())
    except Exception as exc:
        return APIResponse.fail(message=str(exc))
