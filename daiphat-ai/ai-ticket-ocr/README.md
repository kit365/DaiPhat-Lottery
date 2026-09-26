# AI Ticket OCR (DP-269)

FastAPI microservice: image preprocessing, multi-ticket detection and OCR for Vietnamese lottery tickets.
lottery ticket camera-scan feature. Pure inference — this service **never**
writes to a database; Java `core-api` calls it, does business validation
(duplicate check, draw-date rules, product/station ACTIVE check) and
persistence, then answers the mobile app.

## Pipeline (`POST /v1/scan`)

```
image bytes
  -> guard file size / resize to <=1920px          (domain/preprocessing/pipeline.py)
  -> detect ticket regions                          (domain/detection — Strategy+Factory)
  -> per detected ticket:
       perspective warp + denoise + contrast enhance (domain/preprocessing/pipeline.py)
       split into header/body regions               (domain/layouts — Strategy+Factory)
       OCR each region                               (domain/ocr — Strategy+Factory, EasyOCR->PaddleOCR fallback)
       parse fields (station/serial/numbers/date)    (domain/parsing/ticket_parser.py)
       Layer-1 format validation                     (domain/validation/format_validator.py)
       resolve green/yellow/red status                (domain/scanning/status_resolver.py)
  -> ScanResponse { scanId, tickets[], warnings[] }
```

Orchestrated by `domain/scanning/ticket_scan_service.py` (**Legacy first**) then
optional Groq/Gemini/Grok boost via `llm_ticket_scan_service.py` when local
confidence is low or required fields are missing. Wired by `routers/scan.py`:
`TICKET_VISION_LEGACY_FIRST=true` (default). If Groq hits ITPM/token limits
during boost, the already-computed Legacy result is returned immediately
(`TICKET_VISION_GROQ_BOOST_FAIL_FAST`). Set `TICKET_VISION_LEGACY_FIRST=false`
only to force Groq-first (burns free-tier ITPM quickly).

Legacy field location (`TICKET_VISION_LEGACY_TEMPLATE_STRATEGY=true`, default):
YOLO detects each ticket on the detector-sized copy of the upload; its outline
is scaled back to the **original upload**, snapped to the paper edges and
rectified from the original pixels, which is what OCR reads. PaddleOCR reads
the whole ticket to find the station, and that station's OCR template
(`ScanMetadata.stationTemplates`, sent by core-api) locates the fields.

The template is the source of truth for field positions. Field boxes are
expressed relative to the paper edges found inside the template's
`ticketFrame` on its sample photo (`sampleImageUrl`; falls back to the frame
itself when the photo is unavailable), and the same paper-edge snap is applied
to the YOLO outline (`TICKET_VISION_TEMPLATE_PAPER_SNAP`). OCR reads inside the
configured boxes but never moves them: the returned `fieldBoxes` are the exact
template regions (the priority layout that produced the value, reported in
`usedFieldLayouts`). Fields the whole-ticket read already covers confidently
are not re-OCR'd. Stations without a template use the generic heuristic
layout. YOLO field-class boxes are ignored unless
`TICKET_VISION_LEGACY_USE_YOLO_FIELDS=true`.

See [`docs/LOCAL_FIRST_OCR_ROADMAP.md`](docs/LOCAL_FIRST_OCR_ROADMAP.md) for the
phased plan toward fully local OCR.

## Design patterns (see doc section 9)

- **Strategy + Factory, ticket detection** (`domain/detection/`):
  `ContourTicketDetector` (MVP, OpenCV contours + aspect-ratio filter) and
  `YoloObbTicketDetector` (fine-tuned YOLOv8-OBB) both implement
  `TicketDetectorStrategy`. `TicketDetectorFactory` resolves one per request
  — `ScanMetadata.detectorStrategy` wins, else
  `TICKET_VISION_DETECTOR_STRATEGY` — and degrades to the contour detector
  when YOLO's weights or `ultralytics` are unavailable, so a scan never
  fails over a missing model file. Corner ordering, reading order and the
  max-tickets cap live in `domain/detection/ordering.py` and are shared by
  both, so ticket indices don't shift between strategies. See
  `models/README.md` for how `best.pt` reaches the service.
- **Strategy + Factory, OCR engine fallback** (`domain/ocr/`): `EasyOcrStrategy`
  (primary) and `PaddleOcrStrategy` (fallback) both implement `OcrStrategy`.
  `FallbackOcrStrategy` composes them — tries EasyOCR first, retries with
  PaddleOCR if EasyOCR raises or its average confidence is below
  `TICKET_VISION_LOW_CONFIDENCE_THRESHOLD`, and keeps whichever result
  scored higher. `OcrStrategyFactory` builds this composite.
- **Strategy + Factory, OCR region layout** (`domain/layouts/`):
  `GenericLayoutStrategy` splits a ticket crop into `header`/`body` bands
  using a placeholder ratio. `YoloFieldLayoutStrategy`
  (`TICKET_VISION_LAYOUT_STRATEGY=yolo_field`) instead crops each field
  exactly, using the same weights' per-field classes — station-agnostic, so
  it sidesteps hand-calibrating ~40 station designs. It always returns the
  whole crop alongside the field crops, so it can only add information: a
  field the model misses still parses exactly as it does today. Regions
  named `field:<name>` are bound straight to that field by `TicketParser`,
  skipping the token-shape/position guessing the whole-ticket path needs —
  but every value is still validated (date parsed, station fuzzy-matched,
  serial/number shape-checked) before it's accepted.

## Config

All thresholds live in this service's `infra/config.py` `Settings`
class (grep `TICKET_VISION_`): confidence thresholds for green/yellow/red,
upload size/dimension guards, max tickets per photo, the MVP detector's
aspect-ratio/area band, and the station fuzzy-match threshold. All are
placeholder defaults — see the Known limitations section.

## Known limitations / what's calibrated vs. guessed

- **Detection and parsing are not calibrated against real ticket photos.**
  Doc section 6 calls for 50-100 real sample images under varied
  conditions; this environment had none, so `ContourTicketDetector`'s
  aspect-ratio band, `GenericLayoutStrategy`'s header/body split, and
  `TicketParser`'s field-disambiguation heuristics are best-effort against
  the *described* format, not measured. See `fixtures/README.md`.
- **Station master data**: Java should always pass `activeStations` in the
  `/v1/scan` request's `metadata` field — this service has no DB access and
  falls back to a small illustrative seed list
  (`domain/stations/default_aliases.py`) only when metadata is omitted.
- **Per-station OCR layouts and YOLOv8 detection are not implemented** —
  Phase 2 in `daiphat-ai/README.md`'s roadmap. The Strategy/Factory seams
  are in place for both.
- **No async/queue processing** — `/v1/scan` is fully synchronous per this
  phase's scope; doc section 6 suggests RabbitMQ for large batches later.

## Tests

`PYTHONPATH=. pytest -q` from this folder (see `daiphat-ai/README.md` for
environment setup). Test modules live flat at the service root next to the
code they cover, matching `ai-chatbot`.
Most tests (`test_ticket_parser.py`, `test_format_validator.py`,
`test_status_resolver.py`, `test_station_matcher.py`,
`test_fallback_ocr_strategy.py`, `test_scan_router.py`) run against
fakes/stubs and don't need EasyOCR/PaddleOCR installed.
`test_contour_detector.py` needs `opencv-python-headless` + `numpy` and
uses `pytest.importorskip("cv2")` to skip gracefully if they're missing.

## Layout

Mirrors `ai-chatbot`: `main.py` is the FastAPI entrypoint at the service
root (`PYTHONPATH=. uvicorn main:app --port 8090`), the service's own
`contracts/`, `infra/` and `libs/` packages sit next to it, and business code
is grouped under `domain/` with wire types under `dto/`. The folder is also
the Docker build context.
