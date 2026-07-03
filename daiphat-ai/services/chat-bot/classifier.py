import re
from dto.response.chat_classify_response import ChatClassifyResponse
from domain.enums.intent_enum import IntentEnum

def classify_intent(message: str, conversation_id: int = None) -> ChatClassifyResponse:
    """
    Phân loại intent dựa trên keyword và regex (MVP phase 1).
    Tham khảo từ Chatbox Feature/BE/ai-service (sử dụng FastText/ChromaDB fallback trong tương lai).
    """
    text = message.lower().strip()
    
    # 1. ESCALATE REQUEST (Nhân viên, người thật)
    if any(keyword in text for keyword in ["nhân viên", "người thật", "tư vấn viên", "hỗ trợ trực tiếp", "người hỗ trợ"]):
        return ChatClassifyResponse(
            intent=IntentEnum.ESCALATE_REQUEST,
            confidence=0.95,
            entities={},
            suggested_reply="Đang kết nối bạn với nhân viên hỗ trợ. Vui lòng đợi trong giây lát."
        )

    # 2. WEB_RESULT (Kết quả xổ số, dò số)
    if any(keyword in text for keyword in ["kết quả", "xổ số", "trúng không", "dò vé", "vé số", "kqxs"]):
        # Extract thử vé số (6 chữ số)
        ticket_match = re.search(r'\b\d{5,6}\b', text)
        entities = {}
        if ticket_match:
            entities["ticket_number"] = ticket_match.group(0)
            
        return ChatClassifyResponse(
            intent=IntentEnum.WEB_RESULT,
            confidence=0.85 if ticket_match else 0.70,
            entities=entities,
            suggested_reply=None # Để Spring Boot query DB
        )
        
    # 3. WEB_ACCOUNT (Đơn hàng, thanh toán, nạp tiền)
    if any(keyword in text for keyword in ["đơn hàng", "mua vé", "thanh toán", "chưa nhận được", "lỗi nạp tiền", "nạp tiền"]):
        return ChatClassifyResponse(
            intent=IntentEnum.WEB_ACCOUNT,
            confidence=0.80,
            entities={},
            suggested_reply=None # Để Spring Boot query DB
        )
        
    # 4. TRASH_TALK (Chào hỏi, nói chuyện phiếm)
    if text in ["hi", "hello", "chào", "xin chào", "chào bạn", "chào shop"]:
        return ChatClassifyResponse(
            intent=IntentEnum.TRASH_TALK,
            confidence=0.90,
            entities={},
            suggested_reply="Xin chào! Đại Phát có thể giúp gì cho bạn?"
        )

    # 5. UNKNOWN / LOW CONFIDENCE
    return ChatClassifyResponse(
        intent=IntentEnum.UNKNOWN,
        confidence=0.3, # Confidence thấp sẽ khiến Spring Boot escalate
        entities={},
        suggested_reply="Xin lỗi, tôi chưa hiểu rõ ý bạn. Đang kết nối bạn với nhân viên hỗ trợ."
    )
