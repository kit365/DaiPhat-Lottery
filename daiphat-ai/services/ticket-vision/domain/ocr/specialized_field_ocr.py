"""Phase 3: charset-constrained OCR for tight YOLO field crops.

Serial / lottery numbers are short, high-signal glyphs. Unconstrained
EasyOCR often invents letters inside digit runs or drops a digit when the
crop is tiny. Restricting the charset (and optionally a fine-tuned ONNX
recognizer later) keeps the local path competitive without a cloud LLM.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult
from domain.ocr.easyocr_strategy import EasyOcrStrategy
from infra.logger import logger

# Digits + Latin alnum used on VN lottery serials (e.g. 32TV17).
SERIAL_ALLOWLIST = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
# Lottery number rows are digit-only (spaces allowed for multi-digit groups).
NUMBERS_ALLOWLIST = "0123456789 "
# Draw dates are almost always dd/mm/yyyy (or dd-mm-yyyy after parser normalize).
DRAW_DATE_ALLOWLIST = "0123456789/-."

DEFAULT_FIELD_ALLOWLISTS: dict[str, str] = {
    "serialNumber": SERIAL_ALLOWLIST,
    "numbers": NUMBERS_ALLOWLIST,
    "drawDate": DRAW_DATE_ALLOWLIST,
}


class SpecializedFieldOcrStrategy(OcrStrategy):
    """Reads a single-field crop with an allowlist (and optional ONNX later).

    Soft-skips ONNX when weights / onnxruntime are missing — EasyOCR with
    allowlist remains the specialized primary. Callers should still wrap this
    in FieldAwareOcrStrategy so general EasyOCR→Paddle stays the outer
    fallback when confidence is low.
    """

    name = "specialized_field"

    def __init__(
        self,
        easyocr: EasyOcrStrategy | None = None,
        field_allowlists: dict[str, str] | None = None,
        onnx_model_paths: dict[str, str] | None = None,
    ) -> None:
        self._easyocr = easyocr or EasyOcrStrategy()
        self.field_allowlists = field_allowlists or dict(DEFAULT_FIELD_ALLOWLISTS)
        self.onnx_model_paths = {
            field: path for field, path in (onnx_model_paths or {}).items() if (path or "").strip()
        }
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
        return self._easyocr.read_text(
            image,
            languages,
            field_hint=field_hint,
            allowlist=allowlist,
        )

    def _try_onnx(self, image: np.ndarray, field_hint: str) -> list[OcrTextResult] | None:
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
        # Hook for a fine-tuned CRNN/TrOCR export. Keep soft-skip until a
        # trained model + decode contract lands (see models/field_ocr/README).
        if field_hint not in self._onnx_warned:
            logger.warning(
                "Field OCR ONNX for '%s' is present at %s but no runtime decoder "
                "is registered yet — using charset-constrained EasyOCR. "
                "Train + document the ONNX I/O in models/field_ocr/README.md.",
                field_hint,
                path,
            )
            self._onnx_warned.add(field_hint)
        return None
