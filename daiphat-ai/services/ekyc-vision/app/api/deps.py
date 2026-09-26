"""FastAPI dependencies (e.g. API key)."""

from typing import Annotated, Optional

from fastapi import Header, HTTPException

from app.core.config import settings

EXPECTED_KEY_HEADER = "X-API-Key"


def require_api_key(x_api_key: Annotated[Optional[str], Header(alias=EXPECTED_KEY_HEADER)] = None) -> None:
    if not settings.api_key:
        return
    if not x_api_key or x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
