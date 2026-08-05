import numpy as np

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult


class EasyOcrStrategy(OcrStrategy):
    """Primary OCR engine. EasyOCR ships a ready-to-use Vietnamese ('vi')
    model and installs with a single `pip install easyocr` (no extra native
    framework setup), which is why it's the default engine (doc section 7:
    dedicated OCR engines over LLMs).

    `easyocr` (and the torch it pulls in) is imported lazily, on first use,
    rather than at module import time. That keeps every other module in this
    service importable -- and unit-testable -- in environments where the
    heavy ML dependency isn't installed (e.g. this dev sandbox), and avoids
    paying EasyOCR's ~seconds-long model load at process import time for
    requests that end up going straight to the fallback path in tests.
    """

    name = "easyocr"

    def __init__(self) -> None:
        self._reader = None

    def _get_reader(self, languages: list[str]):
        if self._reader is None:
            import easyocr  # noqa: PLC0415 -- intentional lazy import, see class docstring

            self._reader = easyocr.Reader(languages, gpu=False)
        return self._reader

    def read_text(self, image: np.ndarray, languages: list[str] = DEFAULT_LANGUAGES) -> list[OcrTextResult]:
        reader = self._get_reader(languages)
        # detail=1 -> (bbox, text, confidence) tuples; paragraph=False keeps
        # line-level granularity, which the parser regexes over.
        raw_results = reader.readtext(image, detail=1, paragraph=False)
        return [
            OcrTextResult(text=text.strip(), confidence=float(confidence))
            for _bbox, text, confidence in raw_results
            if text and text.strip()
        ]
