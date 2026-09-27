from pathlib import Path
import time

from domain.ocr.ensure_bidi import ensure_bidi

# Before PaddleX / EasyOCR import chains (warmup or first /scan).
ensure_bidi()

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy
from domain.ocr.easyocr_strategy import EasyOcrStrategy
from domain.ocr.fallback_strategy import FallbackOcrStrategy
from domain.ocr.field_aware_strategy import FieldAwareOcrStrategy
from domain.ocr.onnx_field_decoder import OnnxFieldDecoder
from domain.ocr.paddleocr_strategy import PaddleOcrStrategy
from domain.ocr.specialized_field_ocr import SpecializedFieldOcrStrategy
from domain.ocr.torch_threads import apply_torch_thread_limits
from infra.config import settings
from infra.logger import logger

# Cap torch/OMP threads before any EasyOCR Reader is constructed.
apply_torch_thread_limits()

# Reused across requests: each strategy lazily loads (and caches) its own
# model reader on first use, so building the composite once at process
# start avoids re-loading EasyOCR/PaddleOCR's models per request.
_easyocr = EasyOcrStrategy()
_paddleocr = PaddleOcrStrategy()
_onnx_decoder = OnnxFieldDecoder(
    intra_op_threads=int(getattr(settings, "TICKET_VISION_ONNX_INTRA_OP_THREADS", 2) or 2)
)


def _service_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _resolve_model_path(configured: str) -> str:
    path = Path(configured)
    if path.is_absolute():
        return str(path)
    return str(_service_root() / path)


def _primary_engine_name() -> str:
    name = str(getattr(settings, "TICKET_VISION_OCR_PRIMARY_ENGINE", "paddle") or "paddle")
    return name.strip().lower()


def warmup_ocr_engines() -> None:
    """Load OCR models into RAM once at process start (not per /scan)."""
    apply_torch_thread_limits()

    if not bool(getattr(settings, "TICKET_VISION_OCR_WARMUP_ON_STARTUP", True)):
        logger.info("OCR warmup skipped (TICKET_VISION_OCR_WARMUP_ON_STARTUP=false)")
        return

    primary = _primary_engine_name()
    enable_fallback = bool(getattr(settings, "TICKET_VISION_ENABLE_OCR_FALLBACK", False))

    # Warm primary first (Paddle when configured), then the other engine if used.
    engines: list[tuple[str, object]] = []
    if primary == "paddle":
        engines.append(("paddleocr", _paddleocr))
        if enable_fallback:
            engines.append(("easyocr", _easyocr))
    else:
        engines.append(("easyocr", _easyocr))
        if enable_fallback:
            engines.append(("paddleocr", _paddleocr))

    for name, engine in engines:
        t0 = time.perf_counter()
        try:
            engine.warmup(DEFAULT_LANGUAGES)  # type: ignore[attr-defined]
            extra = ""
            if name == "paddleocr":
                kwargs = getattr(_paddleocr, "_init_kwargs", None) or {}
                extra = " kwargs=%s" % {
                    k: kwargs[k]
                    for k in (
                        "enable_mkldnn",
                        "cpu_threads",
                        "device",
                        "lang",
                        "ocr_version",
                        "text_det_limit_side_len",
                    )
                    if k in kwargs
                }
            logger.info("%s warmup ok in %.1fs%s", name, time.perf_counter() - t0, extra)
        except Exception as exc:  # noqa: BLE001
            logger.warning("%s warmup failed (will retry on first scan): %s", name, exc)
            # Paddle may poison at predict-time; warm EasyOCR for emergency fallback.
            if (
                name == "paddleocr"
                and primary == "paddle"
                and not enable_fallback
                and not any(n == "easyocr" for n, _ in engines)
            ):
                t1 = time.perf_counter()
                try:
                    _easyocr.warmup(DEFAULT_LANGUAGES)
                    logger.info(
                        "easyocr emergency warmup ok in %.1fs (paddle warmup failed)",
                        time.perf_counter() - t1,
                    )
                except Exception as easy_exc:  # noqa: BLE001
                    logger.warning("easyocr emergency warmup failed: %s", easy_exc)


class OcrStrategyFactory:
    """Build the OCR stack: primary engine (+ optional fallback) + field routing.

    Default (no JSONL/ONNX needed): PaddleOCR primary with EasyOCR soft-fallback.
    Set ``TICKET_VISION_OCR_PRIMARY_ENGINE=easyocr`` to restore the old order.
    """

    @staticmethod
    def create() -> OcrStrategy:
        primary_name = _primary_engine_name()
        enable_fallback = bool(getattr(settings, "TICKET_VISION_ENABLE_OCR_FALLBACK", False))
        threshold = float(
            getattr(settings, "TICKET_VISION_OCR_FALLBACK_MIN_CONFIDENCE", 0.30) or 0.30
        )

        if primary_name == "paddle":
            primary, secondary = _paddleocr, _easyocr
        else:
            primary, secondary = _easyocr, _paddleocr

        general = FallbackOcrStrategy(
            primary=primary,
            fallback=secondary,
            low_confidence_threshold=threshold,
            enable_fallback=enable_fallback,
        )
        logger.info(
            "OCR stack primary=%s fallback=%s enabled=%s",
            primary.name,
            secondary.name,
            enable_fallback,
        )

        if not getattr(settings, "TICKET_VISION_FIELD_OCR_ENABLED", True):
            return general

        fields_raw = getattr(
            settings,
            "TICKET_VISION_FIELD_OCR_FIELDS",
            "serialNumber,numbers,drawDate,ticketType,batchCode",
        )
        specialized_fields = frozenset(
            part.strip() for part in str(fields_raw).split(",") if part.strip()
        )
        onnx_paths = {
            "serialNumber": _resolve_model_path(
                getattr(
                    settings,
                    "TICKET_VISION_FIELD_OCR_SERIAL_MODEL",
                    "models/field_ocr/serial.onnx",
                )
            ),
            "numbers": _resolve_model_path(
                getattr(
                    settings,
                    "TICKET_VISION_FIELD_OCR_NUMBERS_MODEL",
                    "models/field_ocr/numbers.onnx",
                )
            ),
            "drawDate": _resolve_model_path(
                getattr(
                    settings,
                    "TICKET_VISION_FIELD_OCR_DRAW_DATE_MODEL",
                    "models/field_ocr/draw_date.onnx",
                )
            ),
        }
        # Always route field crops through FallbackOcrStrategy so a permanent
        # Paddle poison can emergency-fall back to EasyOCR (soft low-conf
        # fallback stays gated by enable_fallback inside FallbackOcrStrategy).
        specialized = SpecializedFieldOcrStrategy(
            easyocr=general,  # type: ignore[arg-type]
            onnx_model_paths={f: onnx_paths[f] for f in specialized_fields if f in onnx_paths},
            onnx_decoder=_onnx_decoder,
            use_onnx=bool(getattr(settings, "TICKET_VISION_FIELD_OCR_USE_ONNX", False)),
        )
        return FieldAwareOcrStrategy(
            general=general,
            specialized=specialized,
            specialized_fields=specialized_fields,
            low_confidence_threshold=settings.TICKET_VISION_LOW_CONFIDENCE_THRESHOLD,
            enabled=True,
        )
