from pydantic import BaseModel, Field
from typing import Optional

class ChatClassifyRequest(BaseModel):
    message: str = Field(..., description="Nội dung tin nhắn của khách hàng")
    conversation_id: Optional[int] = Field(None, description="ID của cuộc hội thoại để theo dõi ngữ cảnh (nếu cần)")
