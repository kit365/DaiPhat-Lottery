# Cap CPU math threads BEFORE FastAPI / EasyOCR / torch / PaddleX imports.
# Keep low (2) so Paddle + YOLO do not OpenMP-thrash laptop CPUs.
import os

_default_threads = os.environ.get("TICKET_VISION_PADDLE_CPU_THREADS") or os.environ.get(
    "TICKET_VISION_TORCH_NUM_THREADS"
) or "4"
os.environ.setdefault("OMP_NUM_THREADS", str(_default_threads))
os.environ.setdefault("MKL_NUM_THREADS", str(_default_threads))
os.environ.setdefault("OPENBLAS_NUM_THREADS", str(_default_threads))
os.environ.setdefault("NUMEXPR_NUM_THREADS", str(_default_threads))
# PaddleX defaults MKLDNN on; PIR+oneDNN crashes on many Windows CPUs at predict.
os.environ.setdefault("PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT", "0")
os.environ.setdefault("PADDLE_PDX_CPU_NUM_THREADS", str(_default_threads))

# Before PaddleX / EasyOCR: avoid SAC-blocked python-bidi 0.6 Rust .pyd.
try:
    from domain.ocr.ensure_bidi import ensure_bidi

    ensure_bidi()
except Exception:  # noqa: BLE001
    pass

from fastapi import FastAPI

from contracts.api_response import APIResponse
from infra.config import settings
from infra.logger import logger
from routers.scan import router as scan_router

try:
    from domain.ocr.torch_threads import apply_torch_thread_limits

    apply_torch_thread_limits(
        num_threads=int(getattr(settings, "TICKET_VISION_TORCH_NUM_THREADS", 4) or 4)
    )
except Exception:  # noqa: BLE001
    pass

app = FastAPI(
    title="DaiPhat Ticket Vision Service",
    description="Image preprocessing, ticket detection and OCR for lottery ticket scanning (DP-269).",
    version=settings.VERSION,
)

app.include_router(scan_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def on_startup() -> None:
    engine = (settings.TICKET_VISION_RECOGNITION_ENGINE or "groq").strip().lower()
    if engine == "groq" and not (settings.GROQ_API_KEY or "").strip():
        logger.warning(
            "GROQ_API_KEY is not set — POST /v1/scan with recognitionEngine=groq will fail. "
            "Add GROQ_API_KEY to daiphat-ai/.env (or export it in the shell) and restart ticket-vision."
        )
    if engine == "gemini" and not (settings.GEMINI_API_KEY or "").strip():
        logger.warning(
            "GEMINI_API_KEY is not set — POST /v1/scan with recognitionEngine=gemini will fail. "
            "Add GEMINI_API_KEY to daiphat-ai/.env (or export it in the shell) and restart ticket-vision."
        )
    if engine == "grok" and not (settings.GROK_API_KEY or "").strip():
        logger.warning(
            "GROK_API_KEY is not set — POST /v1/scan with recognitionEngine=grok will fail."
        )

    # Pay EasyOCR (and optional Paddle) cold-start once here, not on first /scan.
    try:
        from domain.ocr.factory import warmup_ocr_engines

        warmup_ocr_engines()
    except Exception as exc:  # noqa: BLE001
        logger.warning("OCR warmup hook failed: %s", exc)


@app.get("/health", tags=["System"])
async def health_check():
    """Async so YOLO/Groq sync work cannot starve the liveness probe."""
    engine = (settings.TICKET_VISION_RECOGNITION_ENGINE or "groq").strip().lower()
    vision_ready = True
    if engine == "groq":
        vision_ready = bool((settings.GROQ_API_KEY or "").strip())
    elif engine == "gemini":
        vision_ready = bool((settings.GEMINI_API_KEY or "").strip())
    elif engine == "grok":
        vision_ready = bool((settings.GROK_API_KEY or "").strip())

    from infra import llm_quota
    from infra import llm_circuit
    from infra.model_manifest import load_model_manifest

    quota = llm_quota.snapshot()
    circuit = llm_circuit.snapshot()
    return APIResponse.ok(
        data={
            "status": "up",
            "recognitionEngine": engine,
            "visionReady": vision_ready,
            "llmQuota": {
                "date": quota.date,
                "used": quota.used,
                "limit": quota.limit,
                "remaining": quota.remaining,
                "exhausted": quota.exhausted,
            },
            "llmCircuit": {
                "open": circuit.open,
                "remainingSeconds": circuit.remainingSeconds,
                "reason": circuit.reason,
            },
            "modelVersions": load_model_manifest(),
            "llmFallbackToLegacy": bool(
                getattr(settings, "TICKET_VISION_LLM_FALLBACK_TO_LEGACY", True)
            ),
            "fieldOcrEnabled": bool(getattr(settings, "TICKET_VISION_FIELD_OCR_ENABLED", True)),
            "ocrWarmupOnStartup": bool(
                getattr(settings, "TICKET_VISION_OCR_WARMUP_ON_STARTUP", True)
            ),
            "ocrPrimaryEngine": str(
                getattr(settings, "TICKET_VISION_OCR_PRIMARY_ENGINE", "paddle") or "paddle"
            ),
            "ocrFallbackEnabled": bool(
                getattr(settings, "TICKET_VISION_ENABLE_OCR_FALLBACK", False)
            ),
            "fieldOcrUseOnnx": bool(
                getattr(settings, "TICKET_VISION_FIELD_OCR_USE_ONNX", False)
            ),
        }
    )


if __name__ == "__main__":
    import uvicorn

    # Cho phép bấm Run trong IDE: python main.py
    # Swagger: http://127.0.0.1:8090/docs
    uvicorn.run("main:app", host="127.0.0.1", port=8090, reload=True)
