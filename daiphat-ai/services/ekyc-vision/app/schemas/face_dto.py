"""Face API DTOs."""

from typing import Optional

from pydantic import BaseModel


class FaceVerifyResponse(BaseModel):
    verified: bool
    distance: float
    threshold: float = 0.68
    model: str = "VGG-Face"
    error: Optional[str] = None
