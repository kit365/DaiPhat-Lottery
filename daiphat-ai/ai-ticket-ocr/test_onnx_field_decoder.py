"""Unit tests for field-OCR ONNX contract + CTC decode (no live EasyOCR)."""

import numpy as np

from domain.ocr.field_ocr_contract import default_contract, save_contract, load_contract
from domain.ocr.onnx_field_decoder import ctc_greedy_decode, preprocess_field_image
from domain.ocr.specialized_field_ocr import SpecializedFieldOcrStrategy
from conftest import StubOcrStrategy


def test_ctc_greedy_decode_digits():
    contract = default_contract("numbers")
    # Build logits [1, T, C] that spell "12" (indices 1='0'... so '1'=2, '2'=3)
    t, c = 4, contract.num_classes
    logits = np.full((1, t, c), -5.0, dtype=np.float32)
    logits[0, 0, 2] = 5.0  # '1'
    logits[0, 1, 2] = 5.0  # repeat → collapse
    logits[0, 2, 0] = 5.0  # blank
    logits[0, 3, 3] = 5.0  # '2'
    text, conf = ctc_greedy_decode(logits, contract)
    assert text == "12"
    assert conf > 0.5


def test_preprocess_shape():
    contract = default_contract("numbers", width=160)
    image = np.full((40, 120, 3), 200, dtype=np.uint8)
    tensor = preprocess_field_image(image, contract)
    assert tensor.shape == (1, 1, 32, 160)
    assert tensor.dtype == np.float32


def test_contract_sidecar_roundtrip(tmp_path):
    onnx_path = tmp_path / "numbers.onnx"
    onnx_path.write_bytes(b"not-a-real-model")
    contract = default_contract("numbers")
    save_contract(onnx_path, contract)
    loaded = load_contract(onnx_path, "numbers")
    assert loaded.charset == contract.charset
    assert loaded.num_classes == 11


def test_specialized_uses_onnx_decoder_when_available(blank_image, tmp_path):
    calls: list[str] = []

    class _Dec:
        def can_decode(self, field_hint, model_path):
            return True

        def read_text(self, image, field_hint, model_path):
            calls.append(field_hint)
            from domain.ocr.base import OcrTextResult

            return [OcrTextResult(text="123456", confidence=0.9)]

    onnx_path = tmp_path / "numbers.onnx"
    onnx_path.write_bytes(b"stub")
    easy = StubOcrStrategy("easy", results=[])
    strategy = SpecializedFieldOcrStrategy(
        easyocr=easy,  # type: ignore[arg-type]
        onnx_model_paths={"numbers": str(onnx_path)},
        onnx_decoder=_Dec(),  # type: ignore[arg-type]
        use_onnx=True,
    )
    result = strategy.read_text(blank_image, field_hint="numbers")
    assert result[0].text == "123456"
    assert calls == ["numbers"]
    assert easy.call_count == 0
