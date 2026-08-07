from domain.ocr.base import OcrStrategy
from domain.ocr.easyocr_strategy import EasyOcrStrategy
from domain.ocr.fallback_strategy import FallbackOcrStrategy
from domain.ocr.paddleocr_strategy import PaddleOcrStrategy
from infra.config import settings

# Reused across requests: each strategy lazily loads (and caches) its own
# model reader on first use, so building the composite once at process
# start avoids re-loading EasyOCR/PaddleOCR's models per request.
_easyocr = EasyOcrStrategy()
_paddleocr = PaddleOcrStrategy()


class OcrStrategyFactory:
    """Factory Pattern: build the OCR strategy the rest of the service talks
    to. Currently always EasyOCR-with-PaddleOCR-fallback; kept as a factory
    (rather than a module-level singleton) so tests can swap in fakes and a
    future config flag could disable the fallback entirely.
    """

    @staticmethod
    def create() -> OcrStrategy:
        return FallbackOcrStrategy(
            primary=_easyocr,
            fallback=_paddleocr,
            low_confidence_threshold=settings.TICKET_VISION_LOW_CONFIDENCE_THRESHOLD,
            enable_fallback=settings.TICKET_VISION_ENABLE_OCR_FALLBACK,
        )
