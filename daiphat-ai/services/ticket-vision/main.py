from fastapi import FastAPI

from contracts.api_response import APIResponse
from infra.config import settings
from infra.logger import logger
from routers.scan import router as scan_router

app = FastAPI(
    title="DaiPhat Ticket Vision Service",
    description="Image preprocessing, ticket detection and OCR for lottery ticket scanning (DP-269).",
    version=settings.VERSION,
)

app.include_router(scan_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def warn_missing_vision_credentials() -> None:
    engine = (settings.TICKET_VISION_RECOGNITION_ENGINE or "gemini").strip().lower()
    if engine == "gemini" and not (settings.GEMINI_API_KEY or "").strip():
        logger.warning(
            "GEMINI_API_KEY is not set — POST /v1/scan with recognitionEngine=gemini will fail. "
            "Add GEMINI_API_KEY to daiphat-ai/.env (or export it in the shell) and restart ticket-vision."
        )
    if engine == "grok" and not (settings.GROK_API_KEY or "").strip():
        logger.warning(
            "GROK_API_KEY is not set — POST /v1/scan with recognitionEngine=grok will fail."
        )


@app.get("/health", tags=["System"])
def health_check():
    engine = (settings.TICKET_VISION_RECOGNITION_ENGINE or "gemini").strip().lower()
    vision_ready = True
    if engine == "gemini":
        vision_ready = bool((settings.GEMINI_API_KEY or "").strip())
    elif engine == "grok":
        vision_ready = bool((settings.GROK_API_KEY or "").strip())
    return APIResponse.ok(
        data={
            "status": "up",
            "recognitionEngine": engine,
            "visionReady": vision_ready,
        }
    )


if __name__ == "__main__":
    import uvicorn

    # Cho phép bấm Run trong IDE: python main.py
    # Swagger: http://127.0.0.1:8090/docs
    uvicorn.run("main:app", host="127.0.0.1", port=8090, reload=True)
