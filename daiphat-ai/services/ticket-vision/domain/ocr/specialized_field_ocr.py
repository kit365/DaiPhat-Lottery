"""Phase 3: charset-constrained OCR for tight YOLO field crops.

Serial / lottery numbers are short, high-signal glyphs. Unconstrained
EasyOCR often invents letters inside digit runs or drops a digit when the
crop is tiny. Prefer ONNX CRNN+CTC when enabled + weights match the
field-OCR contract; otherwise EasyOCR with an allowlist.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult
from domain.ocr.easyocr_strategy import EasyOcrStrategy
from domain.ocr.onnx_field_decoder import OnnxFieldDecoder
from infra.config import settings
from infra.logger import logger

# Digits + Latin letters for VN lottery serials (letter at start or end).
SERIAL_ALLOWLIST = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
# Lottery number rows are digit-only (spaces allowed for multi-digit groups).
NUMBERS_ALLOWLIST = "0123456789 "
# Draw dates are almost always dd/mm/yyyy (or dd-mm-yyyy after parser normalize).
DRAW_DATE_ALLOWLIST = "0123456789/-. "
# Face value / mệnh giá (e.g. 10.000đ) — digits + thousand separators.
TICKET_TYPE_ALLOWLIST = "0123456789.dDđ "

DEFAULT_FIELD_ALLOWLISTS: dict[str, str] = {
    "serialNumber": SERIAL_ALLOWLIST,
    "numbers": NUMBERS_ALLOWLIST,
    "drawDate": DRAW_DATE_ALLOWLIST,
    "ticketType": TICKET_TYPE_ALLOWLIST,
    "batchCode": SERIAL_ALLOWLIST,
}


class SpecializedFieldOcrStrategy(OcrStrategy):
    """Reads a single-field crop via ONNX CRNN (if enabled) else allowlist EasyOCR."""

    name = "specialized_field"

    def __init__(
        self,
        easyocr: EasyOcrStrategy | None = None,
        field_allowlists: dict[str, str] | None = None,
        onnx_model_paths: dict[str, str] | None = None,
        onnx_decoder: OnnxFieldDecoder | None = None,
        use_onnx: bool | None = None,
    ) -> None:
        self._easyocr = easyocr or EasyOcrStrategy()
        self.field_allowlists = field_allowlists or dict(DEFAULT_FIELD_ALLOWLISTS)
        self.onnx_model_paths = {
            field: path for field, path in (onnx_model_paths or {}).items() if (path or "").strip()
        }
        self._onnx_decoder = onnx_decoder or OnnxFieldDecoder()
        self._use_onnx = (
            bool(getattr(settings, "TICKET_VISION_FIELD_OCR_USE_ONNX", False))
            if use_onnx is None
            else bool(use_onnx)
        )
        self._onnx_warned: set[str] = set()

    def supports(self, field_hint: str | None) -> bool:
        return bool(field_hint) and field_hint in self.field_allowlists

    def read_text(
        self,
        image: np.ndarray,
        languages: list[str] = DEFAULT_LANGUAGES,
        *,
        field_hint: str | None = None,
    ) -> list[OcrTextResult]:
        if not self.supports(field_hint):
            return self._easyocr.read_text(image, languages, field_hint=field_hint)

        assert field_hint is not None
        onnx_results = self._try_onnx(image, field_hint)
        if onnx_results is not None:
            return onnx_results

        allowlist = self.field_allowlists[field_hint]
        # Prefer the composite reader (Fallback: Paddle → EasyOCR). Allowlist
        # only applies when the underlying reader is EasyOCR.
        reader = self._easyocr
        try:
            try:
                return reader.read_text(
                    image,
                    languages,
                    field_hint=field_hint,
                    allowlist=allowlist,
                )
            except TypeError:
                return reader.read_text(image, languages, field_hint=field_hint)
        except Exception as exc:  # noqa: BLE001 -- never bubble engine crashes to FieldAware
            logger.warning(
                "Field OCR reader failed for '%s': %s — returning empty",
                field_hint,
                exc,
            )
            return []

    def _try_onnx(self, image: np.ndarray, field_hint: str) -> list[OcrTextResult] | None:
        if not self._use_onnx:
            return None

        model_path = self.onnx_model_paths.get(field_hint)
        if not model_path:
            return None
        path = Path(model_path)
        if not path.is_file():
            if field_hint not in self._onnx_warned:
                logger.info(
                    "Field OCR ONNX for '%s' not found at %s — using charset-constrained EasyOCR",
                    field_hint,
                    path,
                )
                self._onnx_warned.add(field_hint)
            return None

        if not self._onnx_decoder.can_decode(field_hint, path):
            if field_hint not in self._onnx_warned:
                logger.warning(
                    "Field OCR ONNX for '%s' at %s could not be loaded — using EasyOCR. "
                    "See models/field_ocr/README.md for the CRNN+CTC contract.",
                    field_hint,
                    path,
                )
                self._onnx_warned.add(field_hint)
            return None

        try:
            results = self._onnx_decoder.read_text(image, field_hint, path)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Field OCR ONNX decode failed for '%s': %s — using EasyOCR",
                field_hint,
                exc,
            )
            return None

        if results:
            return results
        # Empty decode (often an untrained smoke model predicting all CTC blanks).
        # Fall through to EasyOCR allowlist once — FieldAware must NOT run a
        # second unconstrained EasyOCR pass on top of this.
        if field_hint not in self._onnx_warned:
            logger.warning(
                "Field OCR ONNX for '%s' returned empty text (model likely untrained "
                "or normalize/blank mismatch) — using EasyOCR allowlist. "
                "Retrain with scripts/export_field_ocr_onnx.py --dataset ... or set "
                "TICKET_VISION_FIELD_OCR_USE_ONNX=false",
                field_hint,
            )
            self._onnx_warned.add(field_hint)
        return None
