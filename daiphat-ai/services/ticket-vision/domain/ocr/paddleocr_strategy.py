import numpy as np

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult

# PaddleOCR's language codes don't match ISO ("vi" -> "vi" is fine, but it
# only accepts one language per Reader instance, unlike EasyOCR's multi-lang
# reader) -- pick the first requested language, defaulting to Vietnamese.
_DEFAULT_LANG = "vi"


class PaddleOcrStrategy(OcrStrategy):
    """Fallback OCR engine (doc section 9: "OCR engine fallback"). Tried
    when EasyOCR either raises or returns low-confidence results -- see
    FallbackOcrStrategy. Generally more accurate on dense/rotated text than
    EasyOCR but has a heavier install (paddlepaddle framework), which is why
    it's kept as the fallback rather than the primary engine.

    `paddleocr` is imported lazily for the same reason as EasyOcrStrategy:
    keep the rest of the service importable without the heavy ML deps
    installed.
    """

    name = "paddleocr"

    def __init__(self) -> None:
        self._engine = None
        self._engine_lang: str | None = None

    def _get_engine(self, lang: str):
        if self._engine is None or self._engine_lang != lang:
            from paddleocr import PaddleOCR  # noqa: PLC0415 -- intentional lazy import

            self._engine = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
            self._engine_lang = lang
        return self._engine

    def read_text(self, image: np.ndarray, languages: list[str] = DEFAULT_LANGUAGES) -> list[OcrTextResult]:
        lang = languages[0] if languages else _DEFAULT_LANG
        engine = self._get_engine(lang)
        raw_results = engine.ocr(image, cls=True)

        results: list[OcrTextResult] = []
        # PaddleOCR returns a list-per-image; each entry is [bbox, (text, confidence)].
        for page in raw_results or []:
            for _bbox, (text, confidence) in page or []:
                if text and text.strip():
                    results.append(OcrTextResult(text=text.strip(), confidence=float(confidence)))
        return results
