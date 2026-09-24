"""Face match business logic."""

from __future__ import annotations

from typing import Any

from app.ai_models import face_engine


def verify(selfie_bytes: bytes, id_front_bytes: bytes, model_name: str = "hog") -> dict[str, Any]:
    return face_engine.verify_faces(selfie_bytes, id_front_bytes, model_name)
