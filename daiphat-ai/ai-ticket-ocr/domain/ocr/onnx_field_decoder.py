"""ONNX Runtime CRNN+CTC decoder for YOLO field crops."""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from domain.ocr.base import OcrTextResult
from domain.ocr.field_ocr_contract import (
    DEFAULT_INPUT_WIDTH,
    FieldOcrContract,
    MAX_INPUT_WIDTH,
    MIN_INPUT_WIDTH,
    load_contract,
)
from infra.logger import logger


def preprocess_field_image(
    image: np.ndarray,
    contract: FieldOcrContract,
) -> np.ndarray:
    """BGR/gray crop → NCHW float32 ``[1, 1, H, W]`` matching the contract."""
    if image is None or image.size == 0:
        raise ValueError("empty image")

    if image.ndim == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    height = max(1, int(contract.height))
    target_w = max(MIN_INPUT_WIDTH, min(int(contract.width or DEFAULT_INPUT_WIDTH), MAX_INPUT_WIDTH))

    h, w = gray.shape[:2]
    scale = height / float(h)
    new_w = max(1, int(round(w * scale)))
    resized = cv2.resize(gray, (new_w, height), interpolation=cv2.INTER_AREA)

    if new_w > target_w:
        resized = cv2.resize(resized, (target_w, height), interpolation=cv2.INTER_AREA)
        canvas = resized
    else:
        canvas = np.full((height, target_w), 255, dtype=np.uint8)
        canvas[:, :new_w] = resized

    x = canvas.astype(np.float32) / 255.0
    if contract.normalize == "minus_one_one":
        x = (x - 0.5) / 0.5
    # else leave [0, 1]

    return x[np.newaxis, np.newaxis, :, :]


def ctc_greedy_decode(
    logits: np.ndarray,
    contract: FieldOcrContract,
) -> tuple[str, float]:
    """Decode NTC or NTC-compatible logits → (text, mean confidence)."""
    arr = np.asarray(logits, dtype=np.float32)
    if arr.ndim == 3:
        # Prefer NTC [1, T, C]; accept NCT [1, C, T].
        if arr.shape[-1] == contract.num_classes:
            seq = arr[0]
        elif arr.shape[1] == contract.num_classes:
            seq = np.transpose(arr[0], (1, 0))
        else:
            seq = arr[0]
    elif arr.ndim == 2:
        seq = arr
    else:
        return "", 0.0

    blank = int(contract.blank_index)
    charset = contract.charset
    prev = blank
    chars: list[str] = []
    confs: list[float] = []

    for row in seq:
        # Softmax for confidence; argmax for class.
        shifted = row - np.max(row)
        exp = np.exp(shifted)
        probs = exp / np.clip(exp.sum(), 1e-9, None)
        idx = int(np.argmax(probs))
        if idx != blank and idx != prev:
            char_i = idx - 1 if blank == 0 else idx
            if 0 <= char_i < len(charset):
                chars.append(charset[char_i])
                confs.append(float(probs[idx]))
        prev = idx

    text = "".join(chars)
    confidence = float(sum(confs) / len(confs)) if confs else 0.0
    return text, confidence


class OnnxFieldDecoder:
    """Loads one ONNX CRNN per field and runs CTC greedy decode."""

    def __init__(self, *, intra_op_threads: int = 4) -> None:
        self._sessions: dict[str, object] = {}
        self._contracts: dict[str, FieldOcrContract] = {}
        self._failed: set[str] = set()
        self._intra_op_threads = max(1, int(intra_op_threads))

    def can_decode(self, field_hint: str, model_path: str | Path) -> bool:
        path = Path(model_path)
        if field_hint in self._failed:
            return False
        if field_hint in self._sessions:
            return True
        return path.is_file()

    def read_text(self, image: np.ndarray, field_hint: str, model_path: str | Path) -> list[OcrTextResult]:
        session = self._get_session(field_hint, Path(model_path))
        if session is None:
            return []
        contract = self._contracts[field_hint]
        tensor = preprocess_field_image(image, contract)
        input_name = contract.input_name
        # Prefer configured name; fall back to first session input.
        available = {i.name for i in session.get_inputs()}  # type: ignore[attr-defined]
        if input_name not in available:
            input_name = session.get_inputs()[0].name  # type: ignore[attr-defined]
        outputs = session.run(None, {input_name: tensor})  # type: ignore[attr-defined]
        if not outputs:
            return []
        text, confidence = ctc_greedy_decode(outputs[0], contract)
        if not text:
            return []
        return [OcrTextResult(text=text, confidence=confidence, y_center=0.5, x_center=0.5)]

    def _get_session(self, field_hint: str, path: Path):
        if field_hint in self._sessions:
            return self._sessions[field_hint]
        if field_hint in self._failed:
            return None
        if not path.is_file():
            return None
        try:
            import onnxruntime as ort  # noqa: PLC0415
        except ImportError:
            logger.warning(
                "onnxruntime not installed — field ONNX for '%s' skipped. "
                "pip install onnxruntime",
                field_hint,
            )
            self._failed.add(field_hint)
            return None

        try:
            contract = load_contract(path, field_hint)
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = self._intra_op_threads
            opts.inter_op_num_threads = 1
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            session = ort.InferenceSession(
                str(path),
                sess_options=opts,
                providers=["CPUExecutionProvider"],
            )
            # Align I/O names with the actual graph when possible.
            inputs = session.get_inputs()
            outputs = session.get_outputs()
            if inputs:
                contract = FieldOcrContract(
                    version=contract.version,
                    field_name=contract.field_name,
                    charset=contract.charset,
                    blank_index=contract.blank_index,
                    height=contract.height,
                    width=contract.width,
                    input_name=inputs[0].name,
                    output_name=outputs[0].name if outputs else contract.output_name,
                    input_layout=contract.input_layout,
                    output_layout=contract.output_layout,
                    normalize=contract.normalize,
                )
            self._contracts[field_hint] = contract
            self._sessions[field_hint] = session
            logger.info(
                "Loaded field OCR ONNX for '%s' from %s (C=%s blank=%s charset=%r HxW=%sx%s norm=%s)",
                field_hint,
                path,
                contract.num_classes,
                contract.blank_index,
                contract.charset,
                contract.height,
                contract.width,
                contract.normalize,
            )
            return session
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to load field OCR ONNX for '%s' at %s: %s — using EasyOCR",
                field_hint,
                path,
                exc,
            )
            self._failed.add(field_hint)
            return None
