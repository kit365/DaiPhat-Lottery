from pydantic import BaseModel, Field
from typing import Optional


class ChatGenerateRequest(BaseModel):
    message: str = Field(..., description="Customer message for fortune / open-domain consult")
    conversation_id: Optional[int] = Field(None, description="Conversation context id")
