"""Field-OCR ONNX contract (CRNN + CTC).

This is the I/O contract that ``onnx_field_decoder`` and
``scripts/export_field_ocr_onnx.py`` share. Dropping a random Paddle export
here will NOT work unless it matches these shapes and charset rules.

Contract v1
-----------
Input:
  - name: ``input`` (or first graph input)
  - layout: NCHW float32
  - shape: ``[1, 1, 32, W]`` with W in [64, 320] (export default W=160)
  - grayscale; pixels normalized to ``[-1, 1]`` via ``(x/255 - 0.5) / 0.5``

Output:
  - name: ``logits`` (or first graph output)
  - layout: NTC float32  — ``[1, T, C]`` where C = 1 + len(charset)
  - index 0 = CTC blank; indices 1..len(charset) map to charset characters

Sidecar JSON (recommended next to the ``.onnx``):
  ``numbers.onnx`` + ``numbers.charset.json``

See ``models/field_ocr/README.md``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

# Fixed recognition height for CRNN exports.
INPUT_HEIGHT = 32
# Default / max width used at export and when padding inference crops.
DEFAULT_INPUT_WIDTH = 160
MAX_INPUT_WIDTH = 320
MIN_INPUT_WIDTH = 64
CONTRACT_VERSION = 1

# Per-field CTC charsets (blank is NOT included; blank_index is always 0).
FIELD_CHARSETS: dict[str, str] = {
    "numbers": "0123456789",
    "drawDate": "0123456789/-.",
    "serialNumber": "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "ticketType": "0123456789.",
}


@dataclass(frozen=True)
class FieldOcrContract:
    version: int
    field_name: str
    charset: str
    blank_index: int
    height: int
    width: int
    input_name: str
    output_name: str
    input_layout: str
    output_layout: str
    normalize: str

    @property
    def num_classes(self) -> int:
        return 1 + len(self.charset)  # blank + chars


def default_contract(field_name: str, *, width: int = DEFAULT_INPUT_WIDTH) -> FieldOcrContract:
    charset = FIELD_CHARSETS.get(field_name)
    if not charset:
        raise ValueError(f"No default charset for field '{field_name}'")
    return FieldOcrContract(
        version=CONTRACT_VERSION,
        field_name=field_name,
        charset=charset,
        blank_index=0,
        height=INPUT_HEIGHT,
        width=max(MIN_INPUT_WIDTH, min(int(width), MAX_INPUT_WIDTH)),
        input_name="input",
        output_name="logits",
        input_layout="NCHW",
        output_layout="NTC",
        normalize="minus_one_one",
    )


def contract_to_dict(contract: FieldOcrContract) -> dict:
    return {
        "version": contract.version,
        "fieldName": contract.field_name,
        "charset": contract.charset,
        "blankIndex": contract.blank_index,
        "height": contract.height,
        "width": contract.width,
        "inputName": contract.input_name,
        "outputName": contract.output_name,
        "inputLayout": contract.input_layout,
        "outputLayout": contract.output_layout,
        "normalize": contract.normalize,
    }


def contract_from_dict(data: dict, *, field_name: str | None = None) -> FieldOcrContract:
    name = field_name or str(data.get("fieldName") or data.get("field_name") or "")
    charset = str(data.get("charset") or FIELD_CHARSETS.get(name) or "")
    if not name or not charset:
        raise ValueError("charset JSON missing fieldName/charset")
    return FieldOcrContract(
        version=int(data.get("version") or CONTRACT_VERSION),
        field_name=name,
        charset=charset,
        blank_index=int(data.get("blankIndex", data.get("blank_index", 0))),
        height=int(data.get("height") or INPUT_HEIGHT),
        width=int(data.get("width") or DEFAULT_INPUT_WIDTH),
        input_name=str(data.get("inputName") or data.get("input_name") or "input"),
        output_name=str(data.get("outputName") or data.get("output_name") or "logits"),
        input_layout=str(data.get("inputLayout") or data.get("input_layout") or "NCHW"),
        output_layout=str(data.get("outputLayout") or data.get("output_layout") or "NTC"),
        normalize=str(data.get("normalize") or "minus_one_one"),
    )


def sidecar_path_for_onnx(onnx_path: Path) -> Path:
    return onnx_path.with_suffix(".charset.json")


def load_contract(onnx_path: Path, field_name: str) -> FieldOcrContract:
    sidecar = sidecar_path_for_onnx(onnx_path)
    if sidecar.is_file():
        data = json.loads(sidecar.read_text(encoding="utf-8"))
        return contract_from_dict(data, field_name=field_name)
    return default_contract(field_name)


def save_contract(onnx_path: Path, contract: FieldOcrContract) -> Path:
    sidecar = sidecar_path_for_onnx(onnx_path)
    sidecar.write_text(
        json.dumps(contract_to_dict(contract), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return sidecar
