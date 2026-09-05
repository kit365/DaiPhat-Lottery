# Model weights

`best.pt` — the fine-tuned **YOLOv8-OBB** ticket detector loaded by
`domain/detection/yolo_obb_detector.py`.

The weights file itself is **not** in git (`daiphat-ai/.gitignore` ignores
`*.pt` and `models/*.pt`) — a ~50MB binary doesn't belong in the repo. This
directory is tracked so the path exists for the Docker volume mount.

## Classes

The model is **multi-class** (task `obb`, imgsz 640). Only `Lottery-ticket` is
a whole ticket; everything else is a region *inside* one:

| id | name | used as |
|----|------|---------|
| 3 | `Lottery-ticket` | the ticket regions returned by the detector |
| 1 | `Lottery-Station` | `field:stationName` (yolo_field layout) |
| 2 | `Lottery-Ticket-Serial` | `field:serialNumber` |
| 4 | `drawDate` | `field:drawDate` |
| 7 | `lotteryNumber` | `field:numbers` |
| 8 | `price` | `field:ticketType` |
| 5 | `drawDays` | unused — no equivalent field |
| 0 | `Lottery-QR-Scan` | unused |
| 6 | `lottery station logo` | unused |

`YoloObbTicketDetector` filters to `TICKET_VISION_YOLO_TICKET_CLASS`
(default `Lottery-ticket`), matched by name so a retrain may reorder ids.
Without that filter one photo of 5 tickets yields ~19 boxes and every field
would be reported as its own ticket.

Turn the per-field crops on with:

```bash
TICKET_VISION_LAYOUT_STRATEGY=yolo_field
```

### LLM / Groq path (YOLO + OCR Template)

Default Groq/Gemini/Grok scans also use `best.pt` when present
(`TICKET_VISION_LLM_YOLO_GUIDANCE=true`):

1. YOLO detects `Lottery-ticket` + field classes on the resized photo
2. OCR Template/Layout crops from BE fill fields YOLO missed (Rule A)
3. Merged crops + hint text go to Groq as `extra_images`

Disable with `TICKET_VISION_LLM_YOLO_GUIDANCE=false`. Missing weights soft-skip
to template/full-image only (no scan failure).

**Local docker (`ai` container):** drop `best.pt` here; compose mounts this
directory into the unified `ai` service. Rebuild/restart:

```bash
docker compose up -d --build ai
```

**Local (file only)** — copy from Downloads:

```bash
copy %USERPROFILE%\Downloads\best.pt daiphat-ai\services\ticket-vision\models\best.pt
```

### Measured recall (this model version)

On the sample photo in `daiphat-be/core-api/data/uploads/lottery-tickets/`
(5 tickets), per-field detection is uneven — worth improving in the next
training round:

| field class | found on |
|---|---|
| `lotteryNumber` | 3 / 5 tickets |
| `price` | 2 / 5 |
| `Lottery-Station` | 1 / 5 |
| `Lottery-Ticket-Serial`, `drawDate` | 0 / 5 |

`serialNumber` and `drawDate` are the two fields the whole-ticket parser
finds hardest to disambiguate, so they're exactly where extra labelled
examples would pay off most.

## Provenance

Record this every time the model is retrained, so an ignored binary can
always be traced back to what produced it:

| Field | Value |
|-------|-------|
| Roboflow project / dataset version | _fill in_ |
| Training notebook (Colab) | _fill in_ |
| Base model | `yolov8n-obb.pt` (or the variant actually used) |
| Trained on | _date_ |
| Held-out metrics (mAP50 / mAP50-95) | _fill in_ |

## Getting the file here

**Local dev** — drop `best.pt` in this directory. `docker-compose.yml` mounts
it read-only into the container at
`/app/services/ticket-vision/models`, so retraining only needs a container
restart, not a rebuild.

**Deploy** — the Dockerfile's `COPY services/ticket-vision ./services/ticket-vision`
already bakes in whatever is in this directory (`*.pt` is not in
`.dockerignore`), producing an immutable image. Make sure the file is present
at build time.

## Switching the detector on

The service stays on the contour MVP until told otherwise:

```bash
TICKET_VISION_DETECTOR_STRATEGY=yolov8_obb
```

Per request, Java can also override it via `ScanMetadata.detectorStrategy`
(`"contour"` or `"yolov8_obb"`) — useful for A/B-ing the two detectors on the
same photos without a redeploy. If the weights or `ultralytics` are missing,
`TicketDetectorFactory` logs a warning and falls back to contour detection
rather than failing the scan.
