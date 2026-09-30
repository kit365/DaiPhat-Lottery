import numpy as np

from domain.ocr.base import DEFAULT_LANGUAGES, OcrStrategy, OcrTextResult
from infra.logger import logger

# PaddleOCR's language codes don't match ISO ("vi" -> "vi" is fine, but it
# only accepts one language per Reader instance, unlike EasyOCR's multi-lang
# reader) -- pick the first requested language, defaulting to Vietnamese.
_DEFAULT_LANG = "vi"


def _apply_paddle_runtime_env(*, enable_mkldnn: bool, cpu_threads: int) -> None:
    """Force PaddleX defaults before PaddleOCR/PaddleX import side-effects.

    PaddleOCR 3.x defaults ``enable_mkldnn=True``. On Windows/AMD that path
    crashes at predict-time with PIR/oneDNN Unimplemented — after init succeeds.
    """
    import os

    threads = str(max(1, int(cpu_threads)))
    os.environ.setdefault("PADDLE_PDX_CPU_NUM_THREADS", threads)
    # Must set (not setdefault) when we explicitly want MKLDNN off — paddlex
    # reads this once at import; set early from main.py as well.
    if not enable_mkldnn:
        os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"


def _paddle_init_candidates(lang: str) -> tuple[dict, ...]:
    """Build PaddleOCR kwargs — lean mobile PP-OCR first (no doc-ori / UVDoc).

    PaddleOCR 3.x common kwargs are ``device`` / ``enable_mkldnn`` / ``cpu_threads``.
    Passing legacy ``use_gpu`` raises ``Unknown argument`` and silently skipped
    the MKLDNN-off candidate — leaving default MKLDNN=True (predict crash).

    Default ``ocr_version=PP-OCRv3`` selects mobile det/rec for ``vi`` — much
    faster on CPU than the auto PP-OCRv6 medium models when MKLDNN is off.
    """
    try:
        from infra.config import settings  # noqa: PLC0415
    except Exception:  # noqa: BLE001
        settings = None

    use_gpu = bool(getattr(settings, "TICKET_VISION_PADDLE_USE_GPU", False)) if settings else False
    enable_mkldnn = (
        bool(getattr(settings, "TICKET_VISION_PADDLE_ENABLE_MKLDNN", False)) if settings else False
    )
    cpu_threads = int(getattr(settings, "TICKET_VISION_PADDLE_CPU_THREADS", 4) or 4) if settings else 4
    threads = max(1, cpu_threads)
    ocr_version = (
        str(getattr(settings, "TICKET_VISION_PADDLE_OCR_VERSION", "PP-OCRv3") or "PP-OCRv3").strip()
        if settings
        else "PP-OCRv3"
    )
    configured_lang = (
        str(getattr(settings, "TICKET_VISION_PADDLE_LANG", lang) or lang).strip()
        if settings
        else lang
    ) or lang
    det_limit = (
        int(getattr(settings, "TICKET_VISION_PADDLE_DET_LIMIT_SIDE_LEN", 960) or 960)
        if settings
        else 960
    )
    _apply_paddle_runtime_env(enable_mkldnn=enable_mkldnn, cpu_threads=threads)
    device = "gpu" if use_gpu else "cpu"

    # PaddleOCR 3.7 / PaddleX lean pipeline (det + rec only). MKLDNN off first.
    lean_v3 = {
        "lang": configured_lang,
        "device": device,
        "ocr_version": ocr_version,
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
        "use_textline_orientation": False,
        "enable_mkldnn": enable_mkldnn,
        "cpu_threads": threads,
        "text_det_limit_side_len": max(320, det_limit),
        "text_det_limit_type": "max",
    }
    lean_v3_no_det_limit = {
        "lang": configured_lang,
        "device": device,
        "ocr_version": ocr_version,
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
        "use_textline_orientation": False,
        "enable_mkldnn": False,
        "cpu_threads": threads,
    }
    lean_v3_minimal = {
        "lang": configured_lang,
        "device": device,
        "ocr_version": ocr_version,
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
        "use_textline_orientation": False,
        "enable_mkldnn": False,
    }
    # Older paddleocr 2.x kwargs (tried if v3 rejects unknown args).
    classic = {
        "use_angle_cls": False,
        "lang": configured_lang,
        "use_gpu": use_gpu,
        "enable_mkldnn": enable_mkldnn,
        "cpu_threads": threads,
        "show_log": False,
    }
    classic_mid = {
        "use_angle_cls": False,
        "lang": configured_lang,
        "enable_mkldnn": False,
        "cpu_threads": threads,
    }
    minimal = {"lang": configured_lang, "enable_mkldnn": False}
    return (lean_v3, lean_v3_no_det_limit, lean_v3_minimal, classic, classic_mid, minimal)


def _prepare_paddle_image(image: np.ndarray) -> np.ndarray:
    """PaddleOCR expects contiguous HxWx3 uint8 BGR (or gray promoted to 3ch)."""
    if image is None or image.size == 0:
        raise ValueError("empty image for PaddleOCR")
    arr = image
    if arr.dtype != np.uint8:
        arr = np.clip(arr, 0, 255).astype(np.uint8)
    if arr.ndim == 2:
        arr = np.stack([arr, arr, arr], axis=-1)
    elif arr.ndim == 3 and arr.shape[2] == 4:
        arr = arr[:, :, :3]
    elif arr.ndim == 3 and arr.shape[2] == 1:
        arr = np.repeat(arr, 3, axis=2)
    return np.ascontiguousarray(arr)


def _is_pdx_reinit_error(exc: BaseException) -> bool:
    text = f"{type(exc).__name__}: {exc}".lower()
    return "already been initialized" in text or "reinitialization is not supported" in text


def _is_paddle_runtime_poison(exc: BaseException) -> bool:
    """True when further Paddle calls in this process are likely futile."""
    text = f"{type(exc).__name__}: {exc}".lower()
    needles = (
        "convertpirattribute2runtimeattribute",
        "pir::arrayattribute",
        "unimplemented",
        "onednn",
        "mkldnn",
        "disabling paddle",
        "no module named 'paddle",
        "libpaddle",
        "tuple index out of range",
    )
    return any(n in text for n in needles) or _is_pdx_reinit_error(exc)


def _pad_for_recognition(image: np.ndarray, pad: int = 24) -> np.ndarray:
    """White border so Paddle det (or rec resampling) is not flush to crop edges.

    YOLO field boxes hug glyphs tightly; without margin the det head often
    returns zero boxes → empty OCR → slow EasyOCR fallback.
    """
    pad = max(4, int(pad))
    return np.pad(
        image,
        ((pad, pad), (pad, pad), (0, 0)),
        mode="constant",
        constant_values=255,
    )


# PaddleX allows only ONE pipeline init per process. Never construct a second
# PaddleOCR / TextRecognition after the first succeeds (or partially locks PDX).
_SHARED_PADDLE_OCR = None
_SHARED_PADDLE_OCR_LANG: str | None = None
_SHARED_PADDLE_OCR_KWARGS: dict | None = None
_SHARED_PADDLE_OCR_LOCK_ERROR: str | None = None


def _create_paddle_ocr_once(lang: str):
    """Create at most one PaddleOCR instance for the whole process."""
    global _SHARED_PADDLE_OCR, _SHARED_PADDLE_OCR_LANG, _SHARED_PADDLE_OCR_KWARGS
    global _SHARED_PADDLE_OCR_LOCK_ERROR

    if _SHARED_PADDLE_OCR is not None:
        return _SHARED_PADDLE_OCR, _SHARED_PADDLE_OCR_KWARGS
    if _SHARED_PADDLE_OCR_LOCK_ERROR is not None:
        raise RuntimeError(_SHARED_PADDLE_OCR_LOCK_ERROR)

    from paddleocr import PaddleOCR  # noqa: PLC0415 -- intentional lazy import

    last_error: Exception | None = None
    pdx_locked = False
    for kwargs in _paddle_init_candidates(lang):
        try:
            engine = PaddleOCR(**kwargs)
            _SHARED_PADDLE_OCR = engine
            _SHARED_PADDLE_OCR_LANG = lang
            _SHARED_PADDLE_OCR_KWARGS = dict(kwargs)
            return engine, _SHARED_PADDLE_OCR_KWARGS
        except (TypeError, ValueError) as exc:
            last_error = exc
            # Some builds lock PDX even when kwargs are rejected afterward.
            if _is_pdx_reinit_error(exc):
                pdx_locked = True
                break
            continue
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if _is_pdx_reinit_error(exc):
                pdx_locked = True
                break
            # Unknown runtime failure on first candidate — do not retry another
            # constructor if PDX may already be live.
            if "paddle" in f"{type(exc).__name__}: {exc}".lower():
                pdx_locked = True
                break
            raise

    detail = last_error or "unknown error"
    if pdx_locked:
        _SHARED_PADDLE_OCR_LOCK_ERROR = (
            f"PaddleOCR/PDX init failed and reinitialization is not supported ({detail})"
        )
    else:
        _SHARED_PADDLE_OCR_LOCK_ERROR = f"PaddleOCR init failed ({detail})"
    raise RuntimeError(_SHARED_PADDLE_OCR_LOCK_ERROR)


class PaddleOcrStrategy(OcrStrategy):
    """PaddleOCR engine (primary by default). Lean det+rec pipeline on CPU.

    YOLO field crops reuse the same PaddleOCR instance with padding + soft det
    thresholds. A separate ``TextRecognition`` pipeline is NOT created —
    PaddleX forbids a second PDX initialization in the same process.
    """

    name = "paddleocr"

    def __init__(self) -> None:
        self._engine = None
        self._engine_lang: str | None = None
        self._init_error: str | None = None
        self._init_kwargs: dict | None = None
        self._runtime_disabled: bool = False
        self._runtime_disable_reason: str | None = None

    def _get_engine(self, lang: str):
        if self._runtime_disabled:
            raise RuntimeError(self._runtime_disable_reason or "disabling paddle for this process")
        if self._init_error is not None:
            raise RuntimeError(self._init_error)
        if self._engine is not None:
            return self._engine
        try:
            engine, kwargs = _create_paddle_ocr_once(lang)
        except Exception as exc:  # noqa: BLE001
            self._init_error = str(exc)
            if _is_paddle_runtime_poison(exc):
                self._disable_runtime(exc)
            raise RuntimeError(self._init_error) from exc
        self._engine = engine
        self._engine_lang = lang
        self._init_kwargs = kwargs
        logger.info(
            "PaddleOCR engine ready (kwargs=%s)",
            {
                k: (kwargs or {}).get(k)
                for k in (
                    "lang",
                    "device",
                    "ocr_version",
                    "use_doc_orientation_classify",
                    "use_doc_unwarping",
                    "use_textline_orientation",
                    "enable_mkldnn",
                    "cpu_threads",
                    "text_det_limit_side_len",
                )
                if kwargs and k in kwargs
            },
        )
        return self._engine

    def warmup(self, languages: list[str] = DEFAULT_LANGUAGES) -> None:
        """Load the single shared PaddleOCR pipeline and run a tiny predict."""
        lang = languages[0] if languages else _DEFAULT_LANG
        engine = self._get_engine(lang)
        probe = np.full((64, 64, 3), 255, dtype=np.uint8)
        try:
            _run_paddle_ocr(engine, probe)
            # Field-crop path uses the same engine (padded + soft det).
            _run_paddle_ocr(engine, _pad_for_recognition(probe, pad=8), field_mode=True)
        except Exception as exc:  # noqa: BLE001
            if _is_paddle_runtime_poison(exc):
                self._disable_runtime(exc)
            raise

    def _disable_runtime(self, exc: BaseException) -> None:
        reason = f"disabling paddle for this process after runtime error: {exc}"
        self._runtime_disabled = True
        self._runtime_disable_reason = reason
        logger.warning("%s", reason)

    def read_text(
        self,
        image: np.ndarray,
        languages: list[str] = DEFAULT_LANGUAGES,
        *,
        field_hint: str | None = None,
    ) -> list[OcrTextResult]:
        if self._runtime_disabled:
            raise RuntimeError(self._runtime_disable_reason or "disabling paddle for this process")

        lang = languages[0] if languages else _DEFAULT_LANG
        height = image.shape[0] or 1
        width = image.shape[1] or 1
        try:
            paddle_image = _prepare_paddle_image(image)
            engine = self._get_engine(lang)
            if field_hint:
                # YOLO already cropped the field — pad + soft det on the shared engine.
                # Do NOT construct TextRecognition (second PDX init is unsupported).
                padded = _pad_for_recognition(paddle_image, pad=40)
                raw_results = _run_paddle_ocr(engine, padded, field_mode=True)
            else:
                raw_results = _run_paddle_ocr(engine, paddle_image)
        except Exception as exc:  # noqa: BLE001
            if _is_paddle_runtime_poison(exc):
                self._disable_runtime(exc)
            raise

        return _results_from_raw(raw_results, height=height, width=width)


def _results_from_raw(raw_results, *, height: int, width: int) -> list[OcrTextResult]:
    results: list[OcrTextResult] = []
    try:
        for bbox, text, confidence in _iter_paddle_lines(raw_results):
            if not text or not str(text).strip():
                continue
            results.append(
                OcrTextResult(
                    text=str(text).strip(),
                    confidence=float(confidence),
                    y_center=_bbox_center(bbox, height, axis=1),
                    x_center=_bbox_center(bbox, width, axis=0),
                )
            )
    except (IndexError, TypeError, ValueError) as exc:
        logger.warning("PaddleOCR returned unreadable payload (%s) — treating as empty", exc)
        return []
    return results


def _run_paddle_ocr(engine, image: np.ndarray, *, field_mode: bool = False):
    """Call PaddleOCR across 2.x (ocr) and 3.x (predict) APIs."""
    errors: list[BaseException] = []

    def _call(fn):
        try:
            return fn(), None
        except Exception as exc:  # noqa: BLE001
            return None, exc

    attempts = []
    if hasattr(engine, "predict"):
        if field_mode:
            # Soft det thresholds for padded YOLO crops (PaddleOCR 3.x has no det=False).
            attempts.append(
                lambda: engine.predict(
                    image,
                    text_det_thresh=0.2,
                    text_det_box_thresh=0.35,
                    text_det_unclip_ratio=2.0,
                )
            )
        attempts.append(lambda: engine.predict(image))
    # Legacy 2.x: det=False is recognition-only on a single crop.
    if field_mode:
        attempts.append(lambda: engine.ocr(image, det=False, cls=False))
        attempts.append(lambda: engine.ocr(image, det=False))
    attempts.append(lambda: engine.ocr(image, cls=True))
    attempts.append(lambda: engine.ocr(image))

    for fn in attempts:
        result, err = _call(fn)
        if err is None:
            return result
        errors.append(err)

    if not errors:
        return None
    last = errors[-1]
    if _is_paddle_runtime_poison(last):
        raise last
    logger.warning("PaddleOCR inference failed (%s) — returning empty", last)
    return None


def _iter_paddle_lines(raw_results):
    """Yield (bbox, text, confidence) from classic and PaddleX result shapes."""
    if raw_results is None:
        return

    if _is_result_container(raw_results):
        yield from _lines_from_result_container(raw_results)
        return

    if not isinstance(raw_results, (list, tuple)):
        return

    for page in raw_results:
        if page is None:
            continue
        if _is_result_container(page):
            yield from _lines_from_result_container(page)
            continue
        if not isinstance(page, (list, tuple)):
            continue
        for item in page:
            try:
                parsed = _parse_classic_line(item)
            except (IndexError, TypeError, ValueError):
                continue
            if parsed is not None:
                yield parsed


def _is_result_container(value) -> bool:
    if isinstance(value, dict):
        return True
    return any(
        hasattr(value, attr)
        for attr in ("rec_texts", "rec_text", "rec_scores", "dt_polys", "json", "keys")
    )


def _lines_from_result_container(value):
    data = value
    if hasattr(value, "json") and callable(value.json):
        try:
            data = value.json
            if callable(data):
                data = data()
        except Exception:  # noqa: BLE001
            data = value
    if hasattr(data, "keys") and not isinstance(data, dict):
        try:
            data = dict(data)
        except Exception:  # noqa: BLE001
            pass

    if isinstance(data, dict):
        # TextRecognition single-line: rec_text / rec_score (singular).
        single_text = data.get("rec_text") or data.get("transcription")
        if single_text is not None and not data.get("rec_texts"):
            conf = float(data.get("rec_score") or data.get("score") or data.get("confidence") or 0.0)
            yield ((0, 0), (1, 0), (1, 1), (0, 1)), single_text, conf
            return
        texts = data.get("rec_texts") or data.get("texts") or []
        scores = data.get("rec_scores") or data.get("scores") or []
        polys = data.get("dt_polys") or data.get("rec_polys") or data.get("boxes") or []
        for index, text in enumerate(texts):
            conf = float(scores[index]) if index < len(scores) else 0.0
            bbox = polys[index] if index < len(polys) else ((0, 0), (1, 0), (1, 1), (0, 1))
            yield bbox, text, conf
        return

    texts = getattr(value, "rec_texts", None) or []
    scores = getattr(value, "rec_scores", None) or []
    polys = getattr(value, "dt_polys", None) or getattr(value, "rec_polys", None) or []
    if not texts:
        single = getattr(value, "rec_text", None)
        if single:
            conf = float(getattr(value, "rec_score", 0.0) or 0.0)
            yield ((0, 0), (1, 0), (1, 1), (0, 1)), single, conf
            return
    for index, text in enumerate(texts):
        conf = float(scores[index]) if index < len(scores) else 0.0
        bbox = polys[index] if index < len(polys) else ((0, 0), (1, 0), (1, 1), (0, 1))
        yield bbox, text, conf


def _parse_classic_line(item):
    """Parse classic ``[bbox, (text, conf)]`` or dict line entries."""
    if isinstance(item, dict):
        text = (
            item.get("transcription")
            or item.get("text")
            or item.get("label")
            or item.get("rec_text")
        )
        if not text:
            return None
        conf = item.get("score") or item.get("confidence") or item.get("rec_score") or 0.0
        bbox = item.get("points") or item.get("box") or item.get("bbox")
        if bbox is None:
            bbox = ((0, 0), (1, 0), (1, 1), (0, 1))
        return bbox, text, float(conf)

    # Recognition-only legacy: [('834712', 0.98)]
    if isinstance(item, (list, tuple)) and len(item) >= 2 and isinstance(item[0], str):
        try:
            return ((0, 0), (1, 0), (1, 1), (0, 1)), item[0], float(item[1])
        except (TypeError, ValueError):
            return None

    if not isinstance(item, (list, tuple)) or len(item) < 2:
        return None

    bbox = item[0]
    meta = item[1]
    if isinstance(meta, (list, tuple)) and len(meta) >= 2:
        return bbox, meta[0], float(meta[1])
    if isinstance(meta, dict):
        text = meta.get("text") or meta.get("transcription")
        if not text:
            return None
        conf = meta.get("confidence") or meta.get("score") or 0.0
        return bbox, text, float(conf)
    return None


def _bbox_center(bbox, image_extent: int, axis: int) -> float:
    try:
        coords = [float(point[axis]) for point in bbox]
    except (TypeError, IndexError, ValueError):
        return 0.5
    if not coords:
        return 0.5
    center = (min(coords) + max(coords)) / 2.0
    return min(max(center / image_extent, 0.0), 1.0)
