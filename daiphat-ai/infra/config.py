from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ignore_extra: monorepo .env có nhiều biến BE không thuộc chat-bot
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "DaiPhat AI Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/v1"

    # --- Ticket Vision (DP-269) --------------------------------------------
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

    # rapidfuzz score (0-100) required to accept a station name/alias match.
    TICKET_VISION_STATION_FUZZY_MATCH_THRESHOLD: int = 80

    # OCR engine fallback (Strategy pattern): EasyOCR runs first; if it
    # raises or its confidence is below the low threshold, PaddleOCR is
    # retried and the higher-confidence result wins.
    TICKET_VISION_ENABLE_OCR_FALLBACK: bool = True

    # Placeholder for future config
    # CHROMA_DB_PATH: str = "./data/chroma"
    # FASTTEXT_MODEL_PATH: str = "./data/models/intent_model.bin"


settings = Settings()
