from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np

DEFAULT_LANGUAGES = ["vi", "en"]


@dataclass
class OcrTextResult:
    """One line/word block recognized in an image, with the engine's own
    confidence for it (already normalized to 0..1)."""

    text: str
    confidence: float


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
