from pydantic import BaseModel, Field
from typing import Optional, List


class ChatGenerateResponse(BaseModel):
    reply: str = Field(..., description="Generated natural-language reply")
    luckyNumbers: List[str] = Field(
        default_factory=list,
        description="Lucky 2-digit fragments from dream book for inventory search",
    )
    symbol: Optional[str] = Field(None, description="Detected dream symbol label, if any")
