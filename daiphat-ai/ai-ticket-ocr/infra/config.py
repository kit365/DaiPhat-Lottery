from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Layout: infra/config.py -> ai-ticket-ocr/ -> daiphat-ai/ -> repo root.
_SERVICE_ROOT = Path(__file__).resolve().parents[1]
_AI_ROOT = _SERVICE_ROOT.parent
_REPO_ROOT = _AI_ROOT.parent


def _discover_env_files() -> tuple[str, ...]:
    """Load .env from daiphat-ai, repo root, the service, or cwd — whichever exists."""
    candidates = (
        _AI_ROOT / ".env",
        _REPO_ROOT / ".env",
        _SERVICE_ROOT / ".env",
        Path.cwd() / ".env",
    )
    discovered = tuple(str(path) for path in candidates if path.is_file())
    return discovered if discovered else (".env",)


_OCR_PROVIDER_TO_ENGINE = {
    "GROQ": "groq",
    "GEMINI": "gemini",
    "GROK": "grok",
    "LEGACY": "legacy",
}


class Settings(BaseSettings):
    # ignore_extra: monorepo .env có nhiều biến BE không thuộc chat-bot
    model_config = SettingsConfigDict(
        env_file=_discover_env_files(),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "DaiPhat AI Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/v1"

    # --- Ticket Vision (DP-269) --------------------------------------------
    # Recognition engine: "groq" (default), "gemini", "grok" (xAI), or "legacy".
    # Leave unset to resolve from OCR_AI_PROVIDER, else default to groq.
    TICKET_VISION_RECOGNITION_ENGINE: str | None = None
    # Local OCR first (default): EasyOCR runs before Groq. Cloud vision only
    # boosts when confidence is low / fields are missing. On Groq ITPM failure,
    # fail-fast returns the Legacy result (no 20–40s Retry-After waits).
    TICKET_VISION_LEGACY_FIRST: bool = True
    # Min ticket confidence (and COMPLETE-equivalent fields) to skip the LLM
    # when LEGACY_FIRST=true. Defaults to the high status threshold.
    TICKET_VISION_LEGACY_SKIP_LLM_MIN_CONFIDENCE: float | None = None
    # When boosting after legacy, fail Groq immediately on ITPM/TPM 429 and
    # return the local OCR result (do not wait 20–40s Retry-After).
    TICKET_VISION_GROQ_BOOST_FAIL_FAST: bool = True
    # Multi-ticket Groq boost: one collage call instead of N sequential calls
    # that stampede free-tier ITPM (~7000/min).
    TICKET_VISION_LLM_BOOST_USE_COLLAGE: bool = True
    # When Groq/Gemini/Grok fails (quota/token limit, timeout, misconfig) or
    # returns zero usable tickets, automatically retry with local EasyOCR/
    # PaddleOCR (legacy) instead of failing the Admin scan.
    TICKET_VISION_LLM_FALLBACK_TO_LEGACY: bool = True
    # Optional alias when TICKET_VISION_RECOGNITION_ENGINE is unset: GROQ|GEMINI|GROK|LEGACY.
    OCR_AI_PROVIDER: str = ""

    # Groq.com vision (OpenAI-compatible). Active default for OCR Scan Vé.
    GROQ_API_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_API_KEY: str = ""
    GROQ_VISION_MODEL: str = "qwen/qwen3.8-27b"
    GROQ_READ_TIMEOUT_SECONDS: float = 45.0

    # Gemini vision (Google Generative Language API). Kept for rollback.
    GEMINI_API_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    GEMINI_API_KEY: str = ""
    GEMINI_VISION_MODEL: str = "gemini-3.6-flash"
    GEMINI_READ_TIMEOUT_SECONDS: float = 60.0

    # Grok/xAI vision (OpenAI-compatible). Kept for rollback via recognitionEngine=grok.
    GROK_API_BASE_URL: str = "https://api.x.ai/v1"
    GROK_API_KEY: str = ""
    GROK_VISION_MODEL: str = "grok-vision-beta"
    GROK_READ_TIMEOUT_SECONDS: float = 60.0

    # Confidence thresholds driving the green/yellow/red status of a scanned
    # ticket. See domain/scanning/status_resolver.py.
    TICKET_VISION_HIGH_CONFIDENCE_THRESHOLD: float = 0.85
    TICKET_VISION_LOW_CONFIDENCE_THRESHOLD: float = 0.70

    # Upload guardrails (mobile is expected to resize before upload; the
    # service re-checks defensively rather than trusting the client).
    TICKET_VISION_MAX_FILE_SIZE_MB: int = 8
    # Soft ceiling for detection/OCR workspace. Prefer compression over
    # aggressive shrink so serial/number glyphs stay readable (Admin FE
    # also avoids downscaling below ~3200px). 1920 keeps YOLO+Groq fast
    # on multi-ticket Admin uploads without hurting digit readability.
    TICKET_VISION_MAX_IMAGE_DIMENSION: int = 1920

    # A single photo may contain several tickets fanned out; cap detection
    # to keep OCR latency bounded (see doc "Potential Pitfalls" section).
    TICKET_VISION_MAX_TICKETS_PER_IMAGE: int = 15

    # MVP contour-detection aspect-ratio band for a single ticket, and the
    # minimum contour area (as a ratio of the full image area) to keep a
    # candidate region. These are placeholder defaults — calibrate against
    # real ticket photos (see fixtures/README.md).
    TICKET_VISION_MIN_TICKET_ASPECT_RATIO: float = 0.28
    TICKET_VISION_MAX_TICKET_ASPECT_RATIO: float = 0.62
    TICKET_VISION_MIN_TICKET_AREA_RATIO: float = 0.01

    # Ticket detector strategy (Strategy+Factory, see
    # domain/detection/factory.py): "contour" (MVP,
    # OpenCV, no weights needed) or "yolov8_obb" (fine-tuned YOLOv8-OBB).
    # Prefers YOLO when best.pt is present; factory soft-falls back to contour
    # if weights/ultralytics are missing.
    TICKET_VISION_DETECTOR_STRATEGY: str = "yolov8_obb"

    # Path to the YOLOv8-OBB weights, relative to the service directory (or
    # absolute). Gitignored (*.pt) -- mounted as a volume in docker-compose
    # for local iteration; COPY it into the image for a real deploy.
    TICKET_VISION_YOLO_MODEL_PATH: str = "models/best.pt"
    # Minimum detection confidence and NMS IoU passed to ultralytics predict().
    TICKET_VISION_YOLO_CONFIDENCE_THRESHOLD: float = 0.45
    TICKET_VISION_YOLO_IOU_THRESHOLD: float = 0.45
    # "cpu", "cuda", "cuda:0", ... -- the container has no GPU by default.
    TICKET_VISION_YOLO_DEVICE: str = "cpu"
    # Extra floor for Lottery-ticket class (field boxes stay at FIELD threshold).
    # Low ticket conf often fires on wood/glass background in table photos.
    TICKET_VISION_YOLO_TICKET_MIN_CONFIDENCE: float = 0.50
    # Min ticket box area as a fraction of the frame (rejects tiny FP scraps).
    TICKET_VISION_YOLO_TICKET_MIN_AREA_RATIO: float = 0.015
    # Aspect (min_side/max_side) band for a paper lottery ticket.
    TICKET_VISION_YOLO_TICKET_MIN_ASPECT: float = 0.28
    TICKET_VISION_YOLO_TICKET_MAX_ASPECT: float = 0.72
    # Prefer detections that contain at least one field box (numbers/serial/…).
    TICKET_VISION_YOLO_REQUIRE_INNER_FIELD: bool = True
    # Drop dark/featureless crops (table wood, glass) before OCR.
    TICKET_VISION_YOLO_REJECT_EMPTY_CROPS: bool = True

    # The trained model is multi-class: besides the whole ticket it also
    # detects individual fields (station, serial, drawDate, lotteryNumber,
    # price, QR, logo). Only this class is a "ticket" -- every other class is
    # a region *inside* one and must not be returned as a separate ticket.
    # Matched by name (case-insensitive) so retraining can reorder class ids.
    TICKET_VISION_YOLO_TICKET_CLASS: str = "Lottery-ticket"

    # OCR region layout (Strategy+Factory, see
    # domain/layouts/factory.py): "generic" splits the
    # ticket into header/body at a fixed, uncalibrated ratio; "yolo_field"
    # uses the model's per-field classes to crop each field exactly, which is
    # the calibration that ratio stands in for. Soft-falls back to generic
    # when best.pt is missing.
    TICKET_VISION_LAYOUT_STRATEGY: str = "yolo_field"
    # LLM path (Groq/Gemini/Grok): run best.pt once for ticket/field crops,
    # merge with OCR Template layouts (YOLO wins per field; template fills gaps).
    # Soft-skips when weights are missing. Turn off to force template/full-image only.
    TICKET_VISION_LLM_YOLO_GUIDANCE: bool = True
    # Per-ticket Groq OCR: for 2..N tickets, run concurrent single-ticket calls
    # (better accuracy than a tiny collage). Above PARALLEL_MAX, use collage.
    TICKET_VISION_PER_TICKET_OCR_BATCH_SIZE: int = 3
    # Match PARALLEL_MAX so crop prep can fan out; Groq calls are still
    # serialized by TICKET_VISION_GROQ_MAX_CONCURRENT (free-tier ITPM).
    TICKET_VISION_PER_TICKET_OCR_WORKERS: int = 4
    # Prefer per-ticket OCR up to this count — collage loses small serial glyphs.
    TICKET_VISION_PER_TICKET_PARALLEL_MAX: int = 8
    # Free/on_demand ITPM≈7000 — one vision call at a time avoids stampede.
    TICKET_VISION_GROQ_MAX_CONCURRENT: int = 1
    # OCR API JPEG budget for ticket crops (Admin review still uses sharper crops).
    # Keep under ~250KB so a single ticket stays within ITPM headroom.
    TICKET_VISION_OCR_CROP_MAX_DIMENSION: int = 960
    TICKET_VISION_OCR_CROP_MAX_BYTES: int = 280_000
    # Multi-ticket collage (only when ticket count > PARALLEL_MAX).
    TICKET_VISION_OCR_COLLAGE_CELL_MAX_HEIGHT: int = 360
    TICKET_VISION_OCR_COLLAGE_COLUMNS: int = 2
    # Attach YOLO serial/numbers zooms even on multi-ticket (1 crop + 1 zoom).
    TICKET_VISION_OCR_FIELD_EXTRAS_ON_MULTI: bool = True
    # Full-frame lighting normalize is expensive on phone photos; YOLO crops
    # already isolate tickets. Enable only if scanning very dark photos.
    TICKET_VISION_NORMALIZE_LIGHTING: bool = False
    # Admin review ticket thumbnails: JPEG (fast) instead of lossless PNG of
    # full-res crops — PNG encode+base64 dominated multi-ticket latency.
    TICKET_VISION_REVIEW_CROP_MAX_DIMENSION: int = 1400
    TICKET_VISION_REVIEW_CROP_JPEG_QUALITY: int = 90
    # Lower than the ticket-detection threshold on purpose: a field box that
    # is slightly off still yields a crop the OCR pass can use, and the
    # parser validates every field value before accepting it, so a spurious
    # box costs an OCR call rather than a wrong reading.
    TICKET_VISION_YOLO_FIELD_CONFIDENCE_THRESHOLD: float = 0.25

    # rapidfuzz score (0-100) required to accept a station name/alias match.
    TICKET_VISION_STATION_FUZZY_MATCH_THRESHOLD: int = 72

    # Prefer PaddleOCR only on CPU (no EasyOCR double-load). Re-enable fallback
    # only when debugging accuracy; dual engines thrash RAM/CPU on laptop hosts.
    TICKET_VISION_OCR_PRIMARY_ENGINE: str = "paddle"
    TICKET_VISION_ENABLE_OCR_FALLBACK: bool = False
    TICKET_VISION_OCR_FALLBACK_MIN_CONFIDENCE: float = 0.30
    # Load OCR models once at process start.
    TICKET_VISION_OCR_WARMUP_ON_STARTUP: bool = True
    # PaddleCPU knobs. MKLDNN stays off (PIR/oneDNN crash on this Windows host).
    # Prefer PP-OCRv3 mobile over default PP-OCRv6 medium — ~5–10× faster on CPU
    # without MKLDNN. Do NOT downgrade paddlepaddle to 2.5.x while using paddleocr 3.x.
    TICKET_VISION_PADDLE_USE_GPU: bool = False
    TICKET_VISION_PADDLE_ENABLE_MKLDNN: bool = False
    TICKET_VISION_PADDLE_CPU_THREADS: int = 4
    TICKET_VISION_PADDLE_OCR_VERSION: str = "PP-OCRv3"
    TICKET_VISION_PADDLE_LANG: str = "vi"
    # Cap detector input side length (px) — smaller = faster on large ticket crops.
    TICKET_VISION_PADDLE_DET_LIMIT_SIDE_LEN: int = 960
    # Cap PyTorch/OMP threads for EasyOCR (match Paddle CPU thread budget).
    TICKET_VISION_TORCH_NUM_THREADS: int = 4
    TICKET_VISION_ONNX_INTRA_OP_THREADS: int = 2
    # Field CRNN ONNX — keep false unless you have trained weights + dataset.
    TICKET_VISION_FIELD_OCR_USE_ONNX: bool = False

    # Phase 3 — field-specialized OCR on YOLO `field:*` crops. Prefers ONNX
    # CRNN+CTC when models/field_ocr/*.onnx (+ charset sidecar) exist; else
    # charset-constrained EasyOCR. See models/field_ocr/README.md.
    TICKET_VISION_FIELD_OCR_ENABLED: bool = True
    TICKET_VISION_FIELD_OCR_FIELDS: str = "serialNumber,numbers,drawDate,ticketType,batchCode"
    TICKET_VISION_FIELD_OCR_SERIAL_MODEL: str = "models/field_ocr/serial.onnx"
    TICKET_VISION_FIELD_OCR_NUMBERS_MODEL: str = "models/field_ocr/numbers.onnx"
    TICKET_VISION_FIELD_OCR_DRAW_DATE_MODEL: str = "models/field_ocr/draw_date.onnx"

    # Phase 4 — ops: soft daily cloud-LLM quota (0 = unlimited) and model
    # version labels for /health + scan responses.
    TICKET_VISION_LLM_DAILY_QUOTA: int = 200
    TICKET_VISION_LLM_QUOTA_DIR: str = "data/llm_quota"
    # After Groq TPD/token exhaustion, skip cloud LLM for this many seconds.
    TICKET_VISION_LLM_CIRCUIT_COOLDOWN_SECONDS: int = 900
    # After transient ITPM/TPM 429 exhaustion, pause cloud briefly (not 15 min).
    TICKET_VISION_LLM_CIRCUIT_SOFT_COOLDOWN_SECONDS: int = 45
    # Legacy/local path: skip multi-pass EasyOCR orientation probes (use
    # geometric text-axis only). Cuts many seconds when Groq falls back.
    TICKET_VISION_LEGACY_FAST_ORIENTATION: bool = True
    # When falling back to legacy on multi-ticket images, prefer one whole-crop
    # EasyOCR pass per ticket (skip header/body split + ROI refine) to stay
    # under Admin scan deadlines.
    TICKET_VISION_LEGACY_FAST_MULTI_TICKET: bool = True
    # Skip ROI re-OCR for low-confidence numbers/date (extra Paddle passes).
    TICKET_VISION_LEGACY_SKIP_ROI_REFINE: bool = True
    # Legacy field location: YOLO only frames the ticket; PaddleOCR reads the
    # whole ticket to find the station, then that station's OCR template
    # (from core-api stationTemplates) locates the fields.
    TICKET_VISION_LEGACY_TEMPLATE_STRATEGY: bool = True
    # YOLO field-class boxes (serial/date/…) are unreliable — opt-in fallback.
    TICKET_VISION_LEGACY_USE_YOLO_FIELDS: bool = False
    # Match the template sample photo onto the upload (image features) and
    # project field boxes through that homography into original pixels.
    TICKET_VISION_TEMPLATE_REGISTRATION: bool = True
    # Fallback when registration fails: snap the template ticketFrame (on the
    # sample photo) and the YOLO ticket box (on the upload) to the paper
    # edges, so field boxes keep their position on the paper.
    TICKET_VISION_TEMPLATE_PAPER_SNAP: bool = True
    TICKET_VISION_TEMPLATE_SAMPLE_TIMEOUT_SECONDS: float = 6.0
    # Template path warps the ticket from the original upload (not the
    # detector-resized copy); cap the rectified ticket's long side.
    TICKET_VISION_TEMPLATE_CANVAS_MAX_DIMENSION: int = 2400
    TICKET_VISION_YOLO_MODEL_VERSION: str = ""
    TICKET_VISION_FIELD_OCR_VERSION: str = ""
    TICKET_VISION_MODEL_MANIFEST_PATH: str = "models/MODEL_MANIFEST.json"

    # Placeholder for future config
    # CHROMA_DB_PATH: str = "./data/chroma"
    # FASTTEXT_MODEL_PATH: str = "./data/models/intent_model.bin"

    @model_validator(mode="after")
    def resolve_recognition_engine(self) -> "Settings":
        """Canonical: TICKET_VISION_RECOGNITION_ENGINE; else OCR_AI_PROVIDER; else groq."""
        engine = (self.TICKET_VISION_RECOGNITION_ENGINE or "").strip().lower()
        if engine:
            object.__setattr__(self, "TICKET_VISION_RECOGNITION_ENGINE", engine)
            return self
        provider = (self.OCR_AI_PROVIDER or "").strip().upper()
        mapped = _OCR_PROVIDER_TO_ENGINE.get(provider, "groq")
        object.__setattr__(self, "TICKET_VISION_RECOGNITION_ENGINE", mapped)
        return self


settings = Settings()
