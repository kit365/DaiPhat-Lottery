import re
from dto.response.chat_classify_response import ChatClassifyResponse
from domain.enums.intent_enum import IntentEnum

_SCHEDULE_KEYWORDS = [
    "lịch quay", "lich quay", "lịch mở thưởng", "giờ quay", "hôm nay quay", "ngày mai quay",
    "tra cứu đài", "tra cuu dai", "lịch đài", "lich dai", "tìm đài", "tim dai",
]
_RESULT_KEYWORDS = ["kết quả", "xổ số", "trúng không", "dò vé", "vé số", "kqxs"]
_ACCOUNT_KEYWORDS = ["đơn hàng", "mua vé", "thanh toán", "chưa nhận được", "lỗi nạp tiền", "nạp tiền"]
_ESCALATE_KEYWORDS = ["nhân viên", "người thật", "tư vấn viên", "hỗ trợ trực tiếp", "người hỗ trợ"]
_FORTUNE_KEYWORDS = ["giấc mơ", "phong thủy", "con số may mắn", "giải mã giấc mơ", "tử vi"]
_TRASH_TALK_EXACT = {"hi", "hello", "chào", "xin chào", "chào bạn", "chào shop"}


def _extract_region(text: str) -> str | None:
    if "miền nam" in text or "mien nam" in text:
        return "MIEN_NAM"
    if "miền trung" in text or "mien trung" in text:
        return "MIEN_TRUNG"
    if "miền bắc" in text or "mien bac" in text:
        return "MIEN_BAC"
    return None


def classify_intent(message: str, conversation_id: int = None) -> ChatClassifyResponse:
    """
    Fallback classifier when Spring Java keyword classifier is uncertain.
    Structured intents return suggested_reply=None — Spring handlers own the reply.
    """
    text = message.lower().strip()

    if any(keyword in text for keyword in _ESCALATE_KEYWORDS):
        return ChatClassifyResponse(
            intent=IntentEnum.ESCALATE_REQUEST,
            confidence=0.95,
            entities={},
            suggested_reply=None,
        )

    if any(keyword in text for keyword in _SCHEDULE_KEYWORDS) or _extract_region(text):
        entities = {}
        region = _extract_region(text)
        if region:
            entities["region"] = region
        return ChatClassifyResponse(
            intent=IntentEnum.WEB_SCHEDULE,
            confidence=0.88 if region else 0.75,
            entities=entities,
            suggested_reply=None,
        )

    if any(keyword in text for keyword in _RESULT_KEYWORDS):
        ticket_match = re.search(r"\b\d{5,6}\b", text)
        entities = {}
        if ticket_match:
            entities["ticket_number"] = ticket_match.group(0)
        return ChatClassifyResponse(
            intent=IntentEnum.WEB_RESULT,
            confidence=0.85 if ticket_match else 0.70,
            entities=entities,
            suggested_reply=None,
        )

    if any(keyword in text for keyword in _ACCOUNT_KEYWORDS):
        return ChatClassifyResponse(
            intent=IntentEnum.WEB_ACCOUNT,
            confidence=0.80,
            entities={},
            suggested_reply=None,
        )

    if any(keyword in text for keyword in _FORTUNE_KEYWORDS):
        return ChatClassifyResponse(
            intent=IntentEnum.OTHER_KNOWLEDGE,
            confidence=0.82,
            entities={},
            suggested_reply=None,
        )

    if text in _TRASH_TALK_EXACT:
        return ChatClassifyResponse(
            intent=IntentEnum.TRASH_TALK,
            confidence=0.90,
            entities={},
            suggested_reply=None,
        )

    return ChatClassifyResponse(
        intent=IntentEnum.UNKNOWN,
        confidence=0.3,
        entities={},
        suggested_reply=None,
    )
