import numpy as np

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult
from infra.logger import logger


def _average_confidence(results: list[OcrTextResult]) -> float:
    if not results:
        return 0.0
    return sum(r.confidence for r in results) / len(results)


class FallbackOcrStrategy(OcrStrategy):
    """Composite strategy: run the primary engine; if it raises OR its
    average confidence is below `low_confidence_threshold`, retry with the
    fallback engine and keep whichever of the two scored higher.

    This is the "OCR engine fallback" strategy called out in doc section 9,
    wired as EasyOCR (primary) -> PaddleOCR (fallback) per your instruction.
    It implements OcrStrategy itself, so callers (TicketScanService) don't
    need to know a fallback is even happening.
    """

    name = "fallback"

    def __init__(
        self,
        primary: OcrStrategy,
        fallback: OcrStrategy,
        low_confidence_threshold: float,
        enable_fallback: bool = True,
    ) -> None:
        self.primary = primary
        self.fallback = fallback
        self.low_confidence_threshold = low_confidence_threshold
        self.enable_fallback = enable_fallback

    def read_text(self, image: np.ndarray, languages: list[str] = DEFAULT_LANGUAGES) -> list[OcrTextResult]:
        primary_results: list[OcrTextResult] | None = None
        primary_failed = False
        try:
            primary_results = self.primary.read_text(image, languages)
        except Exception as exc:  # noqa: BLE001 -- any engine failure should trigger fallback, not crash the scan
            primary_failed = True
            logger.warning("Primary OCR engine '%s' failed: %s", self.primary.name, exc)

        primary_confidence = _average_confidence(primary_results) if primary_results is not None else 0.0

        if not primary_failed and primary_confidence >= self.low_confidence_threshold:
            return primary_results or []

        if not self.enable_fallback:
            return primary_results or []

        logger.info(
            "OCR fallback %s -> %s (primary_failed=%s, primary_confidence=%.2f < %.2f)",
            self.primary.name,
            self.fallback.name,
            primary_failed,
            primary_confidence,
            self.low_confidence_threshold,
        )

        try:
            fallback_results = self.fallback.read_text(image, languages)
        except Exception as exc:  # noqa: BLE001 -- both engines failing degrades to empty text, not a crash
            logger.warning("Fallback OCR engine '%s' also failed: %s", self.fallback.name, exc)
            return primary_results or []

        if primary_results is None:
            return fallback_results

        fallback_confidence = _average_confidence(fallback_results)
        if fallback_confidence > primary_confidence:
            return fallback_results
        return primary_results
