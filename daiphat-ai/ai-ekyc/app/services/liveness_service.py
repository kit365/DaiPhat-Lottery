"""Liveness business logic."""

from __future__ import annotations

from typing import Any

from app.ai_models import liveness_engine


def analyze(selfie_bytes: bytes) -> dict[str, Any]:
    return liveness_engine.analyze_liveness(selfie_bytes)
