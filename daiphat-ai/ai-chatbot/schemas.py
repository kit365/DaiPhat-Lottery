from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class IntentEnum(str, Enum):
    # Lottery Queries
    WEB_SEARCH = "WEB_SEARCH"      # Tìm vé, chọn vé
    WEB_RESULT = "WEB_RESULT"      # Xem kết quả, dò số
    WEB_SUGGEST = "WEB_SUGGEST"    # Giải mã giấc mơ, gợi ý số
    WEB_SCHEDULE = "WEB_SCHEDULE"  # Lịch quay thưởng
    
    # Action/Support
    WEB_ACCOUNT = "WEB_ACCOUNT"    #  trúng thưởng
    WEB_SUPPORT = "WEB_SUPPORT"    # Hướng dẫn, hỗ trợ kỹ thuật
    
    # Casual/Risk
    TRASH_TALK = "TRASH_TALK"      # Nói chuyện phiếm, "rác", greeting
    SYSTEM_ATTACK = "SYSTEM_ATTACK" # Hack, spam hệ thống
    
    # Fallback
    OTHER_KNOWLEDGE = "OTHER_KNOWLEDGE" # Kiến thức chung ngoài xổ số
    UNKNOWN = "UNKNOWN"            # Không xác định
    
    # Chat-specific
    ESCALATE_REQUEST = "ESCALATE_REQUEST" # Yêu cầu gặp nhân viên thật

class ChatClassifyRequest(BaseModel):
    message: str = Field(..., description="Nội dung tin nhắn của khách hàng")
    conversation_id: Optional[int] = Field(None, description="ID của cuộc hội thoại để theo dõi ngữ cảnh (nếu cần)")

class ChatClassifyResponse(BaseModel):
    intent: IntentEnum = Field(..., description="Intent được phân loại dựa trên IntentEnum")
    confidence: float = Field(..., description="Độ tự tin của kết quả phân loại (0.0 - 1.0)")
    entities: Dict[str, Any] = Field(default_factory=dict, description="Các thực thể trích xuất được (VD: station, date, ticket_number)")
    suggested_reply: Optional[str] = Field(None, description="Câu trả lời gợi ý (nếu có), nếu null thì Spring Boot tự handle")
