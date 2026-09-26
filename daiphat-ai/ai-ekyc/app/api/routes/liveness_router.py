"""Liveness routes."""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.api.deps import require_api_key
from app.services import liveness_service

_log = logging.getLogger(__name__)
router = APIRouter(
    prefix="/internal/v1",
    tags=["liveness"],
    dependencies=[Depends(require_api_key)],
)


@router.post("/liveness")
async def liveness_check(
    selfie: UploadFile = File(...),
):
    data = await selfie.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image")
    try:
        return JSONResponse(liveness_service.analyze(data))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception:
        _log.exception("Liveness failed")
        raise HTTPException(status_code=500, detail="Liveness processing failed") from None
