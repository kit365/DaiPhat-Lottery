# Long-term OCR roadmap (local-first)

Goal: **YOLO crops fields + local OCR reads text**. Cloud vision LLMs
(Groq/Gemini/Grok) stay optional boosters / fallbacks, not a hard dependency.

## Phase status

| Phase | Focus | Status in repo |
|-------|--------|----------------|
| **1** | Dataset from Admin corrections → retrain YOLO fields | Export API enriched; labeling guide below |
| **2** | Local-first runtime + LLM → legacy auto-fallback | Implemented (see config) |
| **3** | Field-specialized OCR (serial/numbers) | Implemented (charset OCR + dataset builder; ONNX hook) |
| **4** | Ops: quotas, model versions, periodic retrain | Partial (`/ai-models` registry + metrics) |

## Phase 2 — what ships now

Defaults in `infra/config.py`:

- `TICKET_VISION_LLM_FALLBACK_TO_LEGACY=true` — Groq/Gemini/Grok errors,
  misconfiguration, or zero tickets → retry with EasyOCR/PaddleOCR (`legacy`).
- `TICKET_VISION_DETECTOR_STRATEGY=yolov8_obb` — soft-falls to contour if
  `models/best.pt` missing.
- `TICKET_VISION_LAYOUT_STRATEGY=yolo_field` — soft-falls to generic bands if
  weights missing.

Still default recognition engine = `groq` when keyed, so quality stays high
when quota allows; legacy covers outages.

Disable fallback:

```bash
TICKET_VISION_LLM_FALLBACK_TO_LEGACY=false
```

Force local-only (no cloud):

```bash
TICKET_VISION_RECOGNITION_ENGINE=legacy
```

## Phase 1 — labeling / retrain loop

### 1. Collect ground truth from Admin OCR review

Operators already correct fields in the OCR wizard. Those corrections land in
`ocr_scan_result_fields` (`isCorrected`, `correctedValue`).

### 2. Export JSONL

`POST /api/v1/ai-models/exports` with body like:

```json
{
  "fromDate": "2026-09-01",
  "toDate": "2026-09-30",
  "correctedOnly": true,
  "extraFilters": { "importBatchLineId": 123 }
}
```

Or filter by `scanId` / `usedForModelId`. Files write under
`daiphat.ocr.training-export-dir` (default `./data/ocr-training-exports`).

Each line includes:

- `sourceImageUrl`, `croppedImageUrl`, `sourceImageName`
- `fieldName`, `aiValue`, `correctedValue`, `labelValue` (prefers correction)
- `stationId`, `templateId`, `ocrScanResultId`, `scannedAt`

### 3. Label boxes for YOLO (Roboflow / CVAT)

Use exported image URLs + field names to build OBB boxes for weak classes
(see `models/README.md`):

- Priority: `Lottery-Ticket-Serial`, `drawDate`, then station / numbers / price
- Keep class `Lottery-ticket` for whole tickets

### 4. Retrain & deploy `best.pt`

1. Train from `yolov8n-obb.pt` (or current best)
2. Drop new weights at `services/ticket-vision/models/best.pt`
3. Fill provenance table in `models/README.md`
4. Restart ticket-vision (no rebuild needed for local volume mount)

### 5. Measure

Compare before/after on a fixed photo set (multi-ticket + glare + angle):

- Field recall (serial/date especially)
- % scans COMPLETE without LLM
- Latency p50/p95

## Phase 3 — field-specialized OCR

Ships now (no fine-tuned CRNN required yet):

- **Field-aware routing** on YOLO `field:*` crops: `serialNumber`,
  `numbers`, `drawDate` go through charset-constrained EasyOCR first
  (digits/alnum/date glyphs only), then EasyOCR→Paddle if confidence is
  still low.
- **Config** (`infra/config.py`):
  - `TICKET_VISION_FIELD_OCR_ENABLED=true`
  - `TICKET_VISION_FIELD_OCR_FIELDS=serialNumber,numbers,drawDate`
  - Optional ONNX paths under `models/field_ocr/*.onnx` (soft-skip until a
    decoder is registered — see `models/field_ocr/README.md`).
- **Dataset builder** (train later):

```bash
cd daiphat-ai/services/ticket-vision
python scripts/build_field_ocr_dataset.py \
  --jsonl path/to/ai-models-export.jsonl \
  --out data/field_ocr_dataset \
  --fields serialNumber,numbers,drawDate \
  --image-root /path/to/local/ticket/images   # optional
```

Prefer Admin corrections (`correctedOnly: true` on the export). After you
have enough labelled crops, fine-tune CRNN/Paddle/TrOCR, drop ONNX under
`models/field_ocr/`, and register a decoder.

## Related code

- Scan + fallback: `routers/scan.py`
- Legacy pipeline: `domain/scanning/ticket_scan_service.py`
- Field OCR: `domain/ocr/field_aware_strategy.py`, `specialized_field_ocr.py`
- YOLO guidance (LLM path): `domain/scanning/yolo_llm_guidance.py`
- Export: `AiModelPlatformService` / `AiModelPlatformController`
- Field dataset: `scripts/build_field_ocr_dataset.py`
