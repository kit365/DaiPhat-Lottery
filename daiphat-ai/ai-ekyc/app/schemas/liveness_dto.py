"""Liveness API DTOs (for OpenAPI / future response_model)."""

from typing import Optional

from pydantic import BaseModel


class LivenessResponse(BaseModel):
    is_live: bool
    score: float
    method: str
    raw_laplacian_variance: Optional[float] = None
