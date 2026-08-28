from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Monorepo layout: infra/config.py -> daiphat-ai/ -> repo root.
_AI_ROOT = Path(__file__).resolve().parents[1]
_REPO_ROOT = _AI_ROOT.parent


def _discover_env_files() -> tuple[str, ...]:
    """Load .env from daiphat-ai, repo root, or cwd — whichever exists."""
    candidates = (
        _AI_ROOT / ".env",
        _REPO_ROOT / ".env",
        _AI_ROOT / "services" / "ticket-vision" / ".env",
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
    # Optional alias when TICKET_VISION_RECOGNITION_ENGINE is unset: GROQ|GEMINI|GROK|LEGACY.
    OCR_AI_PROVIDER: str = ""

    # Groq.com vision (OpenAI-compatible). Active default for OCR Scan Vé.
    GROQ_API_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_API_KEY: str = ""
    GROQ_VISION_MODEL: str = "qwen/qwen3.6-27b"
    GROQ_READ_TIMEOUT_SECONDS: float = 60.0

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
    # ticket. See services/ticket-vision/domain/scanning/status_resolver.py.
    TICKET_VISION_HIGH_CONFIDENCE_THRESHOLD: float = 0.85
    TICKET_VISION_LOW_CONFIDENCE_THRESHOLD: float = 0.70

    # Upload guardrails (mobile is expected to resize before upload; the
    # service re-checks defensively rather than trusting the client).
    TICKET_VISION_MAX_FILE_SIZE_MB: int = 5
    TICKET_VISION_MAX_IMAGE_DIMENSION: int = 1920

    # A single photo may contain several tickets fanned out; cap detection
    # to keep OCR latency bounded (see doc "Potential Pitfalls" section).
    TICKET_VISION_MAX_TICKETS_PER_IMAGE: int = 15

    # MVP contour-detection aspect-ratio band for a single ticket, and the
    # minimum contour area (as a ratio of the full image area) to keep a
    # candidate region. These are placeholder defaults — calibrate against
    # real ticket photos (see services/ticket-vision/fixtures/README.md).
    TICKET_VISION_MIN_TICKET_ASPECT_RATIO: float = 0.28
    TICKET_VISION_MAX_TICKET_ASPECT_RATIO: float = 0.62
    TICKET_VISION_MIN_TICKET_AREA_RATIO: float = 0.01

    # Ticket detector strategy (Strategy+Factory, see
    # services/ticket-vision/domain/detection/factory.py): "contour" (MVP,
    # OpenCV, no weights needed) or "yolov8_obb" (fine-tuned YOLOv8-OBB).
    # Stays on "contour" until the trained model is benchmarked against it on
    # a held-out set -- flipping the default is a config change, not a deploy.
    TICKET_VISION_DETECTOR_STRATEGY: str = "contour"

    # Path to the YOLOv8-OBB weights, relative to the service directory (or
    # absolute). Gitignored (*.pt) -- mounted as a volume in docker-compose
    # for local iteration; COPY it into the image for a real deploy.
    TICKET_VISION_YOLO_MODEL_PATH: str = "models/best.pt"
    # Minimum detection confidence and NMS IoU passed to ultralytics predict().
    TICKET_VISION_YOLO_CONFIDENCE_THRESHOLD: float = 0.35
    TICKET_VISION_YOLO_IOU_THRESHOLD: float = 0.45
    # "cpu", "cuda", "cuda:0", ... -- the container has no GPU by default.
    TICKET_VISION_YOLO_DEVICE: str = "cpu"

    # The trained model is multi-class: besides the whole ticket it also
    # detects individual fields (station, serial, drawDate, lotteryNumber,
    # price, QR, logo). Only this class is a "ticket" -- every other class is
    # a region *inside* one and must not be returned as a separate ticket.
    # Matched by name (case-insensitive) so retraining can reorder class ids.
    TICKET_VISION_YOLO_TICKET_CLASS: str = "Lottery-ticket"

    # OCR region layout (Strategy+Factory, see
    # services/ticket-vision/domain/layouts/factory.py): "generic" splits the
    # ticket into header/body at a fixed, uncalibrated ratio; "yolo_field"
    # uses the model's per-field classes to crop each field exactly, which is
    # the calibration that ratio stands in for. Costs one extra inference per
    # ticket, so it's opt-in.
    TICKET_VISION_LAYOUT_STRATEGY: str = "generic"
    # Lower than the ticket-detection threshold on purpose: a field box that
    # is slightly off still yields a crop the OCR pass can use, and the
    # parser validates every field value before accepting it, so a spurious
    # box costs an OCR call rather than a wrong reading.
    TICKET_VISION_YOLO_FIELD_CONFIDENCE_THRESHOLD: float = 0.25

    # rapidfuzz score (0-100) required to accept a station name/alias match.
    TICKET_VISION_STATION_FUZZY_MATCH_THRESHOLD: int = 80

    # OCR engine fallback (Strategy pattern): EasyOCR runs first; if it
    # raises or its confidence is below the low threshold, PaddleOCR is
    # retried and the higher-confidence result wins.
    TICKET_VISION_ENABLE_OCR_FALLBACK: bool = True

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
