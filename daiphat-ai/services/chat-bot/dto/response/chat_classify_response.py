from pydantic import BaseModel, Field
from typing import Optional, Dict
from domain.enums.intent_enum import IntentEnum

class ChatClassifyResponse(BaseModel):
    intent: IntentEnum = Field(..., description="Intent được phân loại dựa trên IntentEnum")
    confidence: float = Field(..., description="Độ tự tin của kết quả phân loại (0.0 - 1.0)")
    entities: Dict[str, str] = Field(default_factory=dict, description="Các thực thể trích xuất được (VD: station, date, ticket_number)")
    suggested_reply: Optional[str] = Field(None, description="Câu trả lời gợi ý (nếu có), nếu null thì Spring Boot tự handle")
