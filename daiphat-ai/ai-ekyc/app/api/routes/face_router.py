"""Face verification routes."""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.api.deps import require_api_key
from app.services import face_service

_log = logging.getLogger(__name__)
router = APIRouter(
    prefix="/internal/v1",
    tags=["face"],
    dependencies=[Depends(require_api_key)],
)


@router.post("/face/verify")
async def face_verify(
    selfie: UploadFile = File(...),
    id_front: UploadFile = File(..., description="ID front (portrait match)"),
):
    selfie_bytes = await selfie.read()
    id_bytes = await id_front.read()
    if not selfie_bytes or not id_bytes:
        raise HTTPException(status_code=400, detail="Missing images")

    try:
        result = face_service.verify(selfie_bytes, id_bytes)
        return JSONResponse(result)
    except Exception as e:
        _log.exception("Face verify failed")
        raise HTTPException(status_code=400, detail=f"Face verification failed: {e!s}") from e
