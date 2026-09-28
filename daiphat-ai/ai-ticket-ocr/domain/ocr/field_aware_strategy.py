"""Phase 3: route YOLO field crops through specialized OCR, else general."""

from __future__ import annotations

import numpy as np

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult
from domain.ocr.specialized_field_ocr import SpecializedFieldOcrStrategy
from infra.logger import logger


def _average_confidence(results: list[OcrTextResult]) -> float:
    if not results:
        return 0.0
    return sum(r.confidence for r in results) / len(results)


class FieldAwareOcrStrategy(OcrStrategy):
    """Composite: specialized field reader → general only on hard failure.

    Specialized already runs ONNX (optional) then charset-constrained EasyOCR.
    Calling ``general`` again on empty results doubled EasyOCR cost (~2× per
    field) and was the main cause of 100s+ scans when ONNX returned blank.
    """

    name = "field_aware"

    def __init__(
        self,
        general: OcrStrategy,
        specialized: SpecializedFieldOcrStrategy,
        specialized_fields: frozenset[str],
        low_confidence_threshold: float,
        enabled: bool = True,
    ) -> None:
        self.general = general
        self.specialized = specialized
        self.specialized_fields = specialized_fields
        self.low_confidence_threshold = low_confidence_threshold
        self.enabled = enabled

    def read_text(
        self,
        image: np.ndarray,
        languages: list[str] = DEFAULT_LANGUAGES,
        *,
        field_hint: str | None = None,
    ) -> list[OcrTextResult]:
        use_specialized = (
            self.enabled
            and field_hint is not None
            and field_hint in self.specialized_fields
            and self.specialized.supports(field_hint)
        )
        if not use_specialized:
            return self.general.read_text(image, languages, field_hint=field_hint)

        try:
            specialized_results = self.specialized.read_text(
                image, languages, field_hint=field_hint
            )
        except Exception as exc:  # noqa: BLE001 -- never fail a scan over specialized OCR
            logger.warning(
                "Specialized field OCR for '%s' failed: %s — falling back to general OCR",
                field_hint,
                exc,
            )
            try:
                return self.general.read_text(image, languages, field_hint=field_hint)
            except Exception as general_exc:  # noqa: BLE001
                logger.warning("General OCR also failed for field '%s': %s", field_hint, general_exc)
                return []

        if specialized_results and _average_confidence(specialized_results) >= self.low_confidence_threshold:
            return specialized_results

        # Empty / low-conf field crops must still try general OCR (Paddle det+rec
        # or EasyOCR). Skipping this left Admin with correct YOLO boxes but
        # every field UNREADABLE on clear tickets (e.g. Cà Mau scenic prints).
        try:
            general_results = self.general.read_text(image, languages, field_hint=field_hint)
        except Exception as general_exc:  # noqa: BLE001
            logger.warning(
                "General OCR fallback failed for field '%s': %s",
                field_hint,
                general_exc,
            )
            return specialized_results or []

        if not specialized_results:
            return general_results or []
        if not general_results:
            return specialized_results
        if _average_confidence(general_results) > _average_confidence(specialized_results):
            return general_results
        return specialized_results
