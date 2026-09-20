from pathlib import Path

from domain.ocr.base import OcrStrategy
from domain.ocr.easyocr_strategy import EasyOcrStrategy
from domain.ocr.fallback_strategy import FallbackOcrStrategy
from domain.ocr.field_aware_strategy import FieldAwareOcrStrategy
from domain.ocr.paddleocr_strategy import PaddleOcrStrategy
from domain.ocr.specialized_field_ocr import SpecializedFieldOcrStrategy
from infra.config import settings

# Reused across requests: each strategy lazily loads (and caches) its own
# model reader on first use, so building the composite once at process
# start avoids re-loading EasyOCR/PaddleOCR's models per request.
_easyocr = EasyOcrStrategy()
_paddleocr = PaddleOcrStrategy()


def _service_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _resolve_model_path(configured: str) -> str:
    path = Path(configured)
    if path.is_absolute():
        return str(path)
    return str(_service_root() / path)


class OcrStrategyFactory:
    """Factory Pattern: build the OCR strategy the rest of the service talks
    to. EasyOCR → PaddleOCR for general crops; Phase 3 wraps that in
    FieldAwareOcrStrategy so serial/numbers/drawDate field crops get a
    charset-constrained (and optional ONNX) first pass.
    """

    @staticmethod
    def create() -> OcrStrategy:
        general = FallbackOcrStrategy(
            primary=_easyocr,
            fallback=_paddleocr,
            low_confidence_threshold=settings.TICKET_VISION_LOW_CONFIDENCE_THRESHOLD,
            enable_fallback=settings.TICKET_VISION_ENABLE_OCR_FALLBACK,
        )
        if not getattr(settings, "TICKET_VISION_FIELD_OCR_ENABLED", True):
            return general

        fields_raw = getattr(settings, "TICKET_VISION_FIELD_OCR_FIELDS", "serialNumber,numbers,drawDate")
        specialized_fields = frozenset(
            part.strip() for part in str(fields_raw).split(",") if part.strip()
        )
        onnx_paths = {
            "serialNumber": _resolve_model_path(
                getattr(settings, "TICKET_VISION_FIELD_OCR_SERIAL_MODEL", "models/field_ocr/serial.onnx")
            ),
            "numbers": _resolve_model_path(
                getattr(settings, "TICKET_VISION_FIELD_OCR_NUMBERS_MODEL", "models/field_ocr/numbers.onnx")
            ),
            "drawDate": _resolve_model_path(
                getattr(settings, "TICKET_VISION_FIELD_OCR_DRAW_DATE_MODEL", "models/field_ocr/draw_date.onnx")
            ),
        }
        specialized = SpecializedFieldOcrStrategy(
            easyocr=_easyocr,
            onnx_model_paths={f: onnx_paths[f] for f in specialized_fields if f in onnx_paths},
        )
        return FieldAwareOcrStrategy(
            general=general,
            specialized=specialized,
            specialized_fields=specialized_fields,
            low_confidence_threshold=settings.TICKET_VISION_LOW_CONFIDENCE_THRESHOLD,
            enabled=True,
        )
