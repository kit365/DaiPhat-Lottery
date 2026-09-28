import numpy as np

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult
from infra.logger import logger


def _average_confidence(results: list[OcrTextResult]) -> float:
    if not results:
        return 0.0
    return sum(r.confidence for r in results) / len(results)


class FallbackOcrStrategy(OcrStrategy):
    """Composite strategy: run the primary engine; optionally fall back.

    When ``enable_fallback=False`` (default for local Paddle-only runs):
    - Soft low-confidence fallback is off.
    - Empty primary does **not** call EasyOCR (that path was a hidden bypass
      that loaded torch and cost ~7–10s per field crop).
    - Charset allowlists stay on the primary engine only.
    - Only a *permanent* primary failure (Paddle poison) may emergency-use
      the secondary engine so the process is not stuck with zero OCR.
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
        self._fallback_permanently_disabled = False
        self._primary_permanently_disabled = False

    def read_text(
        self,
        image: np.ndarray,
        languages: list[str] = DEFAULT_LANGUAGES,
        *,
        field_hint: str | None = None,
        allowlist: str | None = None,
    ) -> list[OcrTextResult]:
        # Soft allowlist path (EasyOCR charset) only when fallback is enabled.
        if allowlist and self.enable_fallback and not self._fallback_permanently_disabled:
            for engine in _engines_preferring_allowlist(self.primary, self.fallback):
                if engine is self.primary and self._primary_permanently_disabled:
                    continue
                if engine is self.fallback and self._fallback_permanently_disabled:
                    continue
                try:
                    return _read_with_optional_allowlist(
                        engine, image, languages, field_hint=field_hint, allowlist=allowlist
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "Allowlist OCR via '%s' failed (field_hint=%s): %s",
                        engine.name,
                        field_hint or "whole",
                        exc,
                    )
                    if engine is self.primary and _is_permanent_engine_failure(str(exc)):
                        self._primary_permanently_disabled = True
                    if engine is self.fallback and _is_permanent_engine_failure(str(exc)):
                        self._fallback_permanently_disabled = True

        primary_results: list[OcrTextResult] | None = None
        primary_failed = False

        if self._primary_permanently_disabled:
            primary_failed = True
        else:
            try:
                primary_results = _read_with_optional_allowlist(
                    self.primary,
                    image,
                    languages,
                    field_hint=field_hint,
                    allowlist=allowlist,
                )
            except Exception as exc:  # noqa: BLE001
                primary_failed = True
                logger.warning("Primary OCR engine '%s' failed: %s", self.primary.name, exc)
                if _is_permanent_engine_failure(str(exc)):
                    self._primary_permanently_disabled = True
                    logger.warning(
                        "Disabling primary OCR engine '%s' for this process "
                        "(will use fallback only)",
                        self.primary.name,
                    )

        primary_confidence = (
            _average_confidence(primary_results) if primary_results is not None else 0.0
        )

        if not primary_failed and primary_confidence >= self.low_confidence_threshold:
            return primary_results or []

        # Emergency: primary permanently dead → secondary even if soft fallback off.
        emergency = self._primary_permanently_disabled
        empty_primary = (not primary_failed) and not (primary_results or [])

        if self._fallback_permanently_disabled:
            return primary_results or []

        if not self.enable_fallback and not emergency:
            # Respect TICKET_VISION_ENABLE_OCR_FALLBACK=false: no EasyOCR on
            # empty/low-conf fields (whole-ticket Paddle still carries parsing).
            return primary_results or []

        if emergency:
            logger.warning(
                "Primary OCR '%s' permanently disabled — emergency fallback to '%s'",
                self.primary.name,
                self.fallback.name,
            )
        elif empty_primary:
            logger.info(
                "OCR empty-primary fallback %s -> %s (field_hint=%s)",
                self.primary.name,
                self.fallback.name,
                field_hint or "whole",
            )
        else:
            logger.info(
                "OCR fallback %s -> %s (primary_failed=%s, primary_confidence=%.2f < %.2f)",
                self.primary.name,
                self.fallback.name,
                primary_failed,
                primary_confidence,
                self.low_confidence_threshold,
            )

        try:
            fallback_results = _read_with_optional_allowlist(
                self.fallback,
                image,
                languages,
                field_hint=field_hint,
                allowlist=allowlist,
            )
        except Exception as exc:  # noqa: BLE001
            detail = str(exc)
            logger.warning("Fallback OCR engine '%s' also failed: %s", self.fallback.name, detail)
            if _is_permanent_engine_failure(detail):
                self._fallback_permanently_disabled = True
                logger.warning(
                    "Disabling OCR fallback engine '%s' for this process after permanent failure",
                    self.fallback.name,
                )
            return primary_results or []

        if primary_results is None:
            return fallback_results

        fallback_confidence = _average_confidence(fallback_results)
        if fallback_confidence > primary_confidence:
            return fallback_results
        return primary_results


def _engines_preferring_allowlist(primary: OcrStrategy, fallback: OcrStrategy) -> list[OcrStrategy]:
    """EasyOCR first when an allowlist is present (Paddle has no charset API)."""
    if fallback.name == "easyocr":
        return [fallback, primary]
    if primary.name == "easyocr":
        return [primary, fallback]
    return [primary, fallback]


def _read_with_optional_allowlist(
    engine: OcrStrategy,
    image: np.ndarray,
    languages: list[str],
    *,
    field_hint: str | None,
    allowlist: str | None,
) -> list[OcrTextResult]:
    if allowlist:
        try:
            return engine.read_text(  # type: ignore[call-arg]
                image, languages, field_hint=field_hint, allowlist=allowlist
            )
        except TypeError:
            pass
    return engine.read_text(image, languages, field_hint=field_hint)


def _is_permanent_engine_failure(detail: str) -> bool:
    text = (detail or "").lower()
    return (
        "unknown argument" in text
        or "show_log" in text
        or "init failed" in text
        or "disabling paddle" in text
        or "no module named" in text
        or "convertpirattribute2runtimeattribute" in text
        or "pir::arrayattribute" in text
        or "unimplemented" in text
        or "onednn" in text
        or "mkldnn" in text
        or "tuple index out of range" in text
    )
