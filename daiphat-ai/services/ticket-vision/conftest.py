import numpy as np
import pytest

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult
from domain.stations.models import StationRef


@pytest.fixture
def sample_stations() -> list[StationRef]:
    return [
        StationRef(
            id=1,
            name="TP. Hồ Chí Minh",
            code="HCM",
            aliases=("tp.hcm", "tp hcm", "sài gòn", "saigon", "ho chi minh"),
        ),
        StationRef(id=2, name="Cần Thơ", code="CTH", aliases=("can tho",)),
        StationRef(id=3, name="Đà Nẵng", code="DNG", aliases=("da nang", "danang")),
    ]


class StubOcrStrategy(OcrStrategy):
    """Test double for OcrStrategy: returns a fixed, pre-scripted result (or
    raises a fixed exception) instead of running a real OCR engine. Lets
    the rest of the pipeline (parsing, validation, status resolution, the
    OCR fallback logic itself) be unit-tested without EasyOCR/PaddleOCR
    installed.
    """

    def __init__(self, name: str, results: list[OcrTextResult] | None = None, error: Exception | None = None):
        self.name = name
        self._results = results or []
        self._error = error
        self.call_count = 0

    def read_text(self, image: np.ndarray, languages: list[str] = DEFAULT_LANGUAGES) -> list[OcrTextResult]:
        self.call_count += 1
        if self._error is not None:
            raise self._error
        return self._results


@pytest.fixture
def blank_image() -> np.ndarray:
    return np.zeros((10, 10, 3), dtype=np.uint8)
