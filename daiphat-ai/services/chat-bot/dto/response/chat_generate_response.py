from pydantic import BaseModel, Field


class ChatGenerateResponse(BaseModel):
    reply: str = Field(..., description="Generated natural-language reply")
