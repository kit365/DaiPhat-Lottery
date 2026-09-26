"""OCR business logic."""

from __future__ import annotations

from typing import Any, Optional

from app.ai_models import ocr_engine


def run_id_card_ocr(front_bytes: bytes) -> dict[str, Any]:
    return ocr_engine.run_ocr(front_bytes)


def run_id_card_ocr_optional(back_bytes: Optional[bytes]) -> Optional[dict[str, Any]]:
    if not back_bytes:
        return None
    return ocr_engine.run_ocr(back_bytes)
