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
        self._reader_langs: tuple[str, ...] | None = None

    def _get_reader(self, languages: list[str]):
        langs = tuple(languages or DEFAULT_LANGUAGES)
        if self._reader is None or self._reader_langs != langs:
            import easyocr  # noqa: PLC0415 -- intentional lazy import, see class docstring

            # cpu/gpu once per process; reuse across tickets in a scan.
            from domain.ocr.torch_threads import apply_torch_thread_limits

            apply_torch_thread_limits()
            self._reader = easyocr.Reader(list(langs), gpu=False, verbose=False)
            self._reader_langs = langs
        return self._reader

    def warmup(self, languages: list[str] = DEFAULT_LANGUAGES) -> None:
        """Force-load the Reader into RAM (call once at process startup)."""
        self._get_reader(languages)

    def read_text(
        self,
        image: np.ndarray,
        languages: list[str] = DEFAULT_LANGUAGES,
        *,
        field_hint: str | None = None,
        allowlist: str | None = None,
    ) -> list[OcrTextResult]:
        del field_hint  # used by FieldAwareOcrStrategy; plain EasyOCR ignores it
        reader = self._get_reader(languages)
        # detail=1 -> (bbox, text, confidence) tuples; paragraph=False keeps
        # line-level granularity, which the parser regexes over. bbox is 4
        # (x, y) corner points -- used below for y_center, not kept as-is.
        # greedy + mag_ratio=1.0 + smaller canvas: large CPU speed win for
        # short lottery glyphs without a second Reader load.
        kwargs: dict = {
            "detail": 1,
            "paragraph": False,
            "decoder": "greedy",
            "beamWidth": 5,
            "batch_size": 1,
            "workers": 0,
            "mag_ratio": 1.0,
            "canvas_size": 1280,
            "text_threshold": 0.6,
            "low_text": 0.3,
            "link_threshold": 0.3,
        }
        if allowlist:
            kwargs["allowlist"] = allowlist
            # Digit/serial crops are small — slightly lower detection floor.
            kwargs["text_threshold"] = 0.55
        raw_results = reader.readtext(image, **kwargs)
        height = image.shape[0] or 1
        width = image.shape[1] or 1
        return [
            OcrTextResult(
                text=text.strip(),
                confidence=float(confidence),
                y_center=_bbox_center(bbox, height, axis=1),
                x_center=_bbox_center(bbox, width, axis=0),
            )
            for bbox, text, confidence in raw_results
            if text and text.strip()
        ]


def _bbox_center(bbox, image_extent: int, axis: int) -> float:
    coords = [point[axis] for point in bbox]
    center = (min(coords) + max(coords)) / 2.0
    return min(max(center / image_extent, 0.0), 1.0)
