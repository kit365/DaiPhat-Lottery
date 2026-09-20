# Field-specialized OCR weights (Phase 3)

Drop fine-tuned recognizer exports here after training on the dataset
built by `scripts/build_field_ocr_dataset.py`.

| File | Field | Config |
|------|--------|--------|
| `serial.onnx` | `serialNumber` | `TICKET_VISION_FIELD_OCR_SERIAL_MODEL` |
| `numbers.onnx` | `numbers` | `TICKET_VISION_FIELD_OCR_NUMBERS_MODEL` |
| `draw_date.onnx` | `drawDate` | `TICKET_VISION_FIELD_OCR_DRAW_DATE_MODEL` |

Until a file exists (or a decoder is registered), runtime uses
**charset-constrained EasyOCR** for those fields, then EasyOCR→Paddle if
confidence is still low.

`*.onnx` is gitignored — same rule as `best.pt`.
