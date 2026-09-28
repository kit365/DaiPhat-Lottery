"""Unit tests for Phase 3 dataset builder (no network / YOLO required)."""

import json
from pathlib import Path

import cv2
import numpy as np

from scripts.build_field_ocr_dataset import build_dataset


def test_build_dataset_from_local_images(tmp_path: Path):
    image_root = tmp_path / "images"
    image_root.mkdir()
    ticket = np.zeros((40, 80, 3), dtype=np.uint8)
    ticket[:] = (20, 40, 60)
    cv2.imwrite(str(image_root / "ticket_a.jpg"), ticket)

    jsonl = tmp_path / "export.jsonl"
    rows = [
        {
            "ocrScanResultId": 101,
            "fieldName": "serialNumber",
            "labelValue": "32TV17",
            "sourceImageName": "ticket_a.jpg",
            "isCorrected": True,
        },
        {
            "ocrScanResultId": 101,
            "fieldName": "stationName",
            "labelValue": "HCM",
            "sourceImageName": "ticket_a.jpg",
        },
        {
            "ocrScanResultId": 102,
            "fieldName": "numbers",
            "labelValue": "298407",
            "sourceImageName": "ticket_a.jpg",
        },
    ]
    jsonl.write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")

    out = tmp_path / "dataset"
    count = build_dataset(
        jsonl_path=jsonl,
        out_dir=out,
        fields=frozenset({"serialNumber", "numbers", "drawDate"}),
        image_root=image_root,
        use_yolo=False,
    )

    assert count == 2
    labels = (out / "labels.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert len(labels) == 2
    parsed = [json.loads(line) for line in labels]
    fields = {row["fieldName"] for row in parsed}
    assert fields == {"serialNumber", "numbers"}
    assert (out / "serialNumber").is_dir()
    assert list((out / "serialNumber").glob("*.jpg"))
