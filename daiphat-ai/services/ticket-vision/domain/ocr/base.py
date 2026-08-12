from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np

DEFAULT_LANGUAGES = ["vi", "en"]


@dataclass
class OcrTextResult:
    """One line/word block recognized in an image, with the engine's own
    confidence for it (already normalized to 0..1).

    y_center is the vertical center of this text's bounding box, normalized
    to 0..1 relative to the image passed to read_text() (0 = top, 1 =
    bottom). x_center is the same, horizontally. Both OCR engines return a
    box per result already -- this just keeps the two numbers the parser
    actually needs (which field a digit run belongs to often hinges on
    where it sits on the ticket, not just its shape; x_center specifically
    lets TicketScanService re-crop a tight, targeted region around a
    low-confidence field for a second OCR pass) instead of the engines' raw
    polygon formats. Both default to 0.5 (unknown/neutral) so callers that
    don't have real position data (tests, future strategies) don't need to
    supply one.
    """

    text: str
    confidence: float
    y_center: float = 0.5
    x_center: float = 0.5


class OcrStrategy(ABC):
    """Strategy interface for a single OCR engine (doc section 9: "OCR
    engine fallback"). Implementations must not raise on "no text found" --
    return an empty list instead. Raising is reserved for genuine engine
    failure (model not loaded, corrupt image, out of memory, ...), which is
    exactly what FallbackOcrStrategy watches for to trigger the fallback
    engine.
    """

    name: str = "base"

    @abstractmethod
    def read_text(self, image: np.ndarray, languages: list[str] = DEFAULT_LANGUAGES) -> list[OcrTextResult]:
        raise NotImplementedError
