# Field-specialized OCR weights (Phase 3)

Drop CRNN+CTC ONNX exports here. The runtime decoder is
`domain/ocr/onnx_field_decoder.py` and the shared I/O contract is
`domain/ocr/field_ocr_contract.py`.

| File | Field | Config |
|------|--------|--------|
| `serial.onnx` + `serial.charset.json` | `serialNumber` | `TICKET_VISION_FIELD_OCR_SERIAL_MODEL` |
| `numbers.onnx` + `numbers.charset.json` | `numbers` | `TICKET_VISION_FIELD_OCR_NUMBERS_MODEL` |
| `draw_date.onnx` + `draw_date.charset.json` | `drawDate` | `TICKET_VISION_FIELD_OCR_DRAW_DATE_MODEL` |

## Contract v1 (= vocab trong hướng dẫn C=11 / C=14)

Code **đã** map đúng bộ từ điển, không cần hard-code `NUMBERS_VOCAB` trong decoder:

| Model | C | Tương đương |
|-------|---|-------------|
| `numbers` | 11 | blank(0) + `0123456789` |
| `drawDate` | 14 | blank(0) + `0123456789/-.` |

Sidecar `*.charset.json` ghi `blankIndex`, `charset`, `normalize`.

**Normalize bắt buộc:** `(pixel/255 - 0.5) / 0.5` → `[-1, 1]`  
(Không dùng chỉ `/255` như một số hướng dẫn — sẽ lệch với model export từ script của repo.)

## Bật ONNX

```env
TICKET_VISION_FIELD_OCR_USE_ONNX=true
```

Nếu ONNX trả rỗng (model chưa học / collapse CTC blank), specialized **vẫn** gọi EasyOCR allowlist **một lần** — không còn gọi general EasyOCR lần 2.

## Train thật (bắt buộc cho độ chính xác)

Synthetic smoke export thường **vẫn empty** trên ảnh vé thật (và cả probe synthetic nếu CTC collapse). Cần crop Admin:

```bash
python scripts/build_field_ocr_dataset.py \
  --jsonl path/to/export.jsonl \
  --out data/field_ocr_dataset \
  --fields numbers,drawDate,serialNumber

python scripts/export_field_ocr_onnx.py \
  --fields numbers,drawDate,serialNumber \
  --dataset data/field_ocr_dataset \
  --epochs 40 \
  --out models/field_ocr
```

Khi train xong, log probe phải in `probe '123456' -> '123456'` (không rỗng) rồi mới kỳ vọng scan vé nhanh + đúng.
