#!/usr/bin/env python3
"""Train (optional) + export CRNN+CTC field OCR models to ONNX.

Produces weights that match ``domain/ocr/field_ocr_contract.py`` so
``OnnxFieldDecoder`` can run them without EasyOCR.

Quick start (synthetic digits — verifies the pipeline end-to-end):

  cd daiphat-ai/ai-ticket-ocr
  python scripts/export_field_ocr_onnx.py --fields numbers,drawDate --epochs 8

With a real dataset from ``build_field_ocr_dataset.py``:

  python scripts/export_field_ocr_onnx.py \\
    --fields numbers,drawDate,serialNumber \\
    --dataset data/field_ocr_dataset \\
    --epochs 30 \\
    --out models/field_ocr

Outputs per field:
  models/field_ocr/numbers.onnx
  models/field_ocr/numbers.charset.json
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import cv2
import numpy as np

_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))

from domain.ocr.field_ocr_contract import (  # noqa: E402
    DEFAULT_INPUT_WIDTH,
    FIELD_CHARSETS,
    INPUT_HEIGHT,
    default_contract,
    save_contract,
)
from domain.ocr.torch_threads import apply_torch_thread_limits  # noqa: E402

apply_torch_thread_limits(num_threads=4)


def _render_text(label: str, width: int = DEFAULT_INPUT_WIDTH, height: int = INPUT_HEIGHT) -> np.ndarray:
    img = np.full((height, width), 255, dtype=np.uint8)
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.85
    thickness = 2
    (tw, th), _ = cv2.getTextSize(label, font, scale, thickness)
    while tw > width - 6 and scale > 0.4:
        scale -= 0.05
        (tw, th), _ = cv2.getTextSize(label, font, scale, thickness)
    x = max(2, (width - tw) // 2 + random.randint(-3, 3))
    y = max(th + 2, (height + th) // 2 + random.randint(-2, 2))
    cv2.putText(img, label, (x, y), font, scale, 0, thickness, cv2.LINE_AA)
    # Mild noise so the net does not memorize a single glyph style.
    if random.random() < 0.5:
        noise = np.random.randint(0, 18, img.shape, dtype=np.uint8)
        img = cv2.subtract(img, noise)
    return img


def _encode_label(label: str, charset: str) -> list[int]:
    mapping = {ch: i + 1 for i, ch in enumerate(charset)}  # 0 = blank
    indices: list[int] = []
    for ch in label.upper() if charset.isupper() or charset == FIELD_CHARSETS["serialNumber"] else label:
        if ch not in mapping and charset == FIELD_CHARSETS["serialNumber"]:
            ch = ch.upper()
        if ch not in mapping:
            continue
        indices.append(mapping[ch])
    return indices


def _synthetic_batch(field: str, batch_size: int, charset: str, *, max_len: int | None = None):
    images = []
    targets = []
    target_lengths = []
    for _ in range(batch_size):
        if field == "numbers":
            n = max_len or random.randint(4, 6)
            n = max(1, min(n, 6))
            label = "".join(random.choice(charset) for _ in range(n))
        elif field == "drawDate":
            if max_len is not None and max_len <= 5:
                label = f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}"
            else:
                label = f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}/{random.randint(2020, 2027)}"
        elif field == "serialNumber":
            letter = random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ")
            digits = "".join(random.choice("0123456789") for _ in range(max_len or 6))
            label = letter + digits if random.random() < 0.5 else digits + letter
        else:
            label = "".join(random.choice(charset.replace(".", "")) for _ in range(5)) + ".000"
        encoded = _encode_label(label, charset)
        if not encoded:
            continue
        img = _render_text(label)
        x = img.astype(np.float32) / 255.0
        x = (x - 0.5) / 0.5
        images.append(x)
        targets.extend(encoded)
        target_lengths.append(len(encoded))
    if not images:
        return None
    batch = np.stack(images)[:, np.newaxis, :, :]
    return batch, targets, target_lengths


def _load_dataset_samples(dataset: Path, field: str, charset: str, limit: int = 2000):
    labels_path = dataset / "labels.jsonl"
    samples: list[tuple[np.ndarray, list[int]]] = []
    if not labels_path.is_file():
        return samples
    for line in labels_path.read_text(encoding="utf-8").splitlines():
        if len(samples) >= limit:
            break
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("fieldName") != field:
            continue
        label = str(row.get("labelValue") or "").strip()
        rel = row.get("path")
        if not label or not rel:
            continue
        img_path = dataset / rel if not Path(rel).is_file() else Path(rel)
        if not img_path.is_file():
            continue
        img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
        img = cv2.resize(img, (DEFAULT_INPUT_WIDTH, INPUT_HEIGHT), interpolation=cv2.INTER_AREA)
        encoded = _encode_label(label, charset)
        if not encoded:
            continue
        samples.append((img, encoded))
    return samples


def _build_model(num_classes: int):
    import torch
    from torch import nn

    class TinyCrnn(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            # Input HxW = 32x160 → after two 2x2 pools: 8x40. Avoid AdaptiveAvgPool
            # (not ONNX-exportable with dynamic width).
            self.cnn = nn.Sequential(
                nn.Conv2d(1, 32, 3, padding=1),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(2, 2),
                nn.Conv2d(32, 64, 3, padding=1),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(2, 2),
                nn.Conv2d(64, 128, 3, padding=1),
                nn.ReLU(inplace=True),
                nn.AvgPool2d(kernel_size=(8, 1)),  # → N,128,1,W'
            )
            self.rnn = nn.LSTM(128, 128, num_layers=2, bidirectional=True, batch_first=True)
            self.fc = nn.Linear(256, num_classes)

        def forward(self, x):
            # x: NCHW
            feats = self.cnn(x)  # N, 128, 1, W'
            feats = feats.squeeze(2).permute(0, 2, 1)  # N, T, 128
            out, _ = self.rnn(feats)
            return self.fc(out)  # N, T, C

    return TinyCrnn()


def _train_and_export(field: str, out_dir: Path, epochs: int, dataset: Path | None) -> Path:
    import torch
    from torch import nn

    from domain.ocr.onnx_field_decoder import ctc_greedy_decode, preprocess_field_image

    charset = FIELD_CHARSETS[field]
    contract = default_contract(field)
    model = _build_model(contract.num_classes)
    device = torch.device("cpu")
    model.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=2e-3)
    ctc = nn.CTCLoss(blank=0, zero_infinity=True)

    real_samples = _load_dataset_samples(dataset, field, charset) if dataset else []
    steps_per_epoch = 24 if not real_samples else max(8, min(40, len(real_samples) // 8 or 8))
    print(
        f"[{field}] real samples={len(real_samples)} epochs={epochs} "
        f"steps/epoch={steps_per_epoch}"
    )

    model.train()
    for epoch in range(epochs):
        epoch_loss = 0.0
        for _step in range(steps_per_epoch):
            if real_samples:
                random.shuffle(real_samples)
                batch_imgs = []
                targets: list[int] = []
                lengths: list[int] = []
                for img, encoded in real_samples[:32]:
                    x = img.astype(np.float32) / 255.0
                    x = (x - 0.5) / 0.5
                    batch_imgs.append(x)
                    targets.extend(encoded)
                    lengths.append(len(encoded))
                batch = np.stack(batch_imgs)[:, np.newaxis, :, :]
            else:
                # Curriculum: short labels first, then full length (helps avoid CTC blank collapse).
                max_len = 2 if epoch < max(2, epochs // 4) else (4 if epoch < max(4, epochs // 2) else None)
                synthetic = _synthetic_batch(field, 32, charset, max_len=max_len)
                if synthetic is None:
                    continue
                batch, targets, lengths = synthetic

            x = torch.from_numpy(batch).to(device)
            logits = model(x)  # N,T,C
            log_probs = logits.log_softmax(2).permute(1, 0, 2)  # T,N,C
            input_lengths = torch.full((x.size(0),), logits.size(1), dtype=torch.long)
            target_tensor = torch.tensor(targets, dtype=torch.long)
            target_lengths = torch.tensor(lengths, dtype=torch.long)
            loss = ctc(log_probs, target_tensor, input_lengths, target_lengths)
            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            optimizer.step()
            epoch_loss += float(loss.detach())

        if (epoch + 1) % max(1, epochs // 5) == 0 or epoch == 0:
            avg = epoch_loss / max(1, steps_per_epoch)
            print(f"  epoch {epoch + 1}/{epochs} loss={avg:.4f}")

    model.eval()
    # Smoke-check: synthetic label must decode to something non-empty before export.
    probe_label = "123456" if field == "numbers" else "08/08/2026"
    probe_img = _render_text(probe_label)
    with torch.no_grad():
        probe_t = preprocess_field_image(probe_img, contract)
        probe_logits = model(torch.from_numpy(probe_t)).numpy()
    probe_text, probe_conf = ctc_greedy_decode(probe_logits, contract)
    print(f"[{field}] probe '{probe_label}' -> '{probe_text}' (conf={probe_conf:.2f})")
    if not probe_text:
        print(
            f"[{field}] WARNING: model still collapses to CTC blank on synthetic probe. "
            "Increase --epochs or provide --dataset with real crops."
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = out_dir / (
        "numbers.onnx"
        if field == "numbers"
        else "draw_date.onnx"
        if field == "drawDate"
        else "serial.onnx"
        if field == "serialNumber"
        else f"{field}.onnx"
    )
    dummy = torch.zeros(1, 1, INPUT_HEIGHT, DEFAULT_INPUT_WIDTH, dtype=torch.float32)
    export_kwargs = {
        "input_names": ["input"],
        "output_names": ["logits"],
        "dynamic_axes": {
            "input": {0: "batch", 3: "width"},
            "logits": {0: "batch", 1: "time"},
        },
        "opset_version": 17,
    }
    try:
        torch.onnx.export(model, dummy, str(onnx_path), dynamo=False, **export_kwargs)
    except TypeError:
        # Older torch without dynamo= kwarg.
        torch.onnx.export(model, dummy, str(onnx_path), **export_kwargs)
    save_contract(onnx_path, contract)
    print(f"[{field}] wrote {onnx_path} + sidecar")
    return onnx_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fields",
        default="numbers,drawDate",
        help="Comma-separated field names (numbers,drawDate,serialNumber)",
    )
    parser.add_argument("--out", type=Path, default=_SERVICE_ROOT / "models" / "field_ocr")
    parser.add_argument("--dataset", type=Path, default=None)
    parser.add_argument("--epochs", type=int, default=8)
    args = parser.parse_args()

    fields = [p.strip() for p in args.fields.split(",") if p.strip()]
    for field in fields:
        if field not in FIELD_CHARSETS:
            raise SystemExit(f"Unsupported field '{field}'. Known: {sorted(FIELD_CHARSETS)}")
        _train_and_export(field, args.out, args.epochs, args.dataset)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
