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
    """Composite: specialized field reader → general EasyOCR/Paddle fallback.

    For regions named ``field:<name>`` (via field_hint), try the specialized
    engine first. If it raises, returns empty, or scores below
    ``low_confidence_threshold``, retry with ``general`` and keep the better
    of the two — same confidence tournament as FallbackOcrStrategy.
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

        specialized_results: list[OcrTextResult] | None = None
        specialized_failed = False
        try:
            specialized_results = self.specialized.read_text(
                image, languages, field_hint=field_hint
            )
        except Exception as exc:  # noqa: BLE001 -- never fail a scan over specialized OCR
            specialized_failed = True
            logger.warning(
                "Specialized field OCR for '%s' failed: %s — falling back to general OCR",
                field_hint,
                exc,
            )

        specialized_confidence = (
            _average_confidence(specialized_results) if specialized_results is not None else 0.0
        )
        if (
            not specialized_failed
            and specialized_results
            and specialized_confidence >= self.low_confidence_threshold
        ):
            return specialized_results

        logger.info(
            "Field OCR '%s' → general (failed=%s, conf=%.2f < %.2f or empty)",
            field_hint,
            specialized_failed,
            specialized_confidence,
            self.low_confidence_threshold,
        )
        try:
            general_results = self.general.read_text(image, languages, field_hint=field_hint)
        except Exception as exc:  # noqa: BLE001
            logger.warning("General OCR also failed for field '%s': %s", field_hint, exc)
            return specialized_results or []

        if specialized_results is None or not specialized_results:
            return general_results

        if _average_confidence(general_results) > specialized_confidence:
            return general_results
        return specialized_results
