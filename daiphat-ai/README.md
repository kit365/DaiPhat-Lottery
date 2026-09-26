# daiphat-ai

DaiPhat AI services (computer vision, OCR, chatbot analytics, fortune telling).
Each service is fully self-contained: its own code, requirements, Dockerfile,
Docker build context, CI workflow and deploy workflow.

**Jira:** [DP-269](https://jira.atlassian.com) — Thêm mới vé số bằng Camera

## Role in the system

`daiphat-ai/` is a sibling folder to `daiphat-be/` (Java 21 / Spring Boot), `daiphat-fe/` (Next.js 15) and `daiphat_mobile/` (Flutter).
Java `core-api` orchestrates business rules, auth, and DB; Python services handle inference only.

```
DaiPhat-Lottery-System/
├── daiphat-be/       # Spring Boot — API, validation, persistence
├── daiphat-fe/       # Next.js — Web customer & admin portal
├── daiphat_mobile/   # Flutter — camera, scan UI
└── daiphat-ai/       # FastAPI AI microservices
```

## Services

| Folder | Display name | Purpose | Port |
|--------|--------------|---------|------|
| `ai-chatbot/` | AI Chatbot | NLP intent classification and fortune replies for the web chat widget | 8000 |
| `ai-ticket-ocr/` | AI Ticket OCR | Camera ticket scan (DP-269): detection, OCR, parsing, validation | 8090 |
| `ai-ekyc/` | AI eKYC | CCCD OCR and face matching for customer eKYC | 8000 (8091 locally) |

## Conventions

- Every service is an independent FastAPI app with `main.py` as its entrypoint
  (`ai-ekyc` uses `app/main.py`). Run `uvicorn` and `pytest` from the service
  folder with `PYTHONPATH=.`.
- Nothing is shared between services. Helper packages (`contracts/`, `infra/`,
  `libs/`) live inside the service that uses them.
- The Docker build context is the service folder itself.
- Mobile calls Java; Java calls Python (not direct mobile → Python).

## Roadmap (DP-269)

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Monorepo skeleton | Done |
| 1 | FastAPI AI Ticket OCR + `/health` + `/v1/scan`: OpenCV contour detection (MVP), EasyOCR with a PaddleOCR fallback strategy, station fuzzy matching, Layer-1 format validation, green/yellow/red status resolution | Done — not yet calibrated against real ticket photos (see `ai-ticket-ocr/fixtures/README.md`) |
| 2 | Fine-tuned YOLOv8 detector for overlapping/cluttered photos; per-station OCR region layouts | Done, off by default — `YoloObbTicketDetector` (`TICKET_VISION_DETECTOR_STRATEGY=yolov8_obb`) and `YoloFieldLayoutStrategy` (`TICKET_VISION_LAYOUT_STRATEGY=yolo_field`). Both need `models/best.pt`; they fall back to contour/generic without it. Not yet benchmarked against the MVP, so the defaults stay unchanged |
| 3 | Java `core-api` integration + Flutter scan UI | Java side done (`TicketVisionAdapter` → `POST /v1/scan`, Layer-2 business validation in `TicketScanImportService`); Flutter scan UI not started |

## Local setup

> **Không** dùng `pip install -e .` (package chưa cấu hình sẵn). Dùng lệnh bên dưới.

Each service may have its own `.venv`; the run scripts fall back to a shared
`daiphat-ai/.venv` when the service has none.

### Run AI Chatbot (port 8000 — khớp Java `daiphat.chat.ai.service.base-url`)

```bash
cd daiphat-ai/ai-chatbot
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
./scripts/run.sh
# or: PYTHONPATH=. uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Endpoints:

| Method | Path | Mục đích |
|--------|------|----------|
| GET | `/health` | Health check |
| POST | `/v1/chat/classify` | Phân loại intent |
| POST | `/v1/chat/generate` | Sinh câu trả lời (placeholder) |
| GET | `/docs` | Swagger UI |

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/v1/chat/classify \
  -H 'Content-Type: application/json' \
  -d '{"message":"lịch quay miền nam","conversation_id":1}'
```

### Run AI Ticket OCR (port 8090)

```bash
cd daiphat-ai/ai-ticket-ocr
python -m pip install -r requirements.txt
./scripts/run.sh                   # Windows: scripts\run.bat
```

> EasyOCR/PaddleOCR pull in a full ML framework each (torch, paddlepaddle) —
> the first install and the first `/v1/scan` call (model download + load)
> are noticeably slower than the chatbot's.

Endpoints:

| Method | Path | Mục đích |
|--------|------|----------|
| GET | `/health` | Health check |
| POST | `/v1/scan` | Multipart `file` (ảnh) + optional `metadata` (JSON `ScanMetadata`) → detect, OCR, parse, validate every ticket in the photo |
| GET | `/docs` | Swagger UI |

```bash
curl http://localhost:8090/health
curl -X POST http://localhost:8090/v1/scan \
  -F "file=@/path/to/ticket-photo.jpg"
```

See `ai-ticket-ocr/` for the full pipeline (detection → preprocessing →
OCR → parsing → validation → status) and its test suite.

### Run AI eKYC (port 8091 locally)

See [`ai-ekyc/README.md`](ai-ekyc/README.md). On Windows: `ai-ekyc\scripts\run.bat`.

## Docker

From the repository root, the standard local stack builds and starts all AI
services (`ai-chatbot` on 8000, `ai-ticket-ocr` on 8090, `ai-ekyc` on 8091)
alongside PostgreSQL, Redis, backend and frontend:

```bash
docker compose up -d --build
```

The services are separate containers in the same `daiphat-local` network. The
backend calls `http://ai-chatbot:8000`, `http://ai-ticket-ocr:8090` and
`http://ai-ekyc:8000`. Start, rebuild, restart or stop any AI service
independently:

```bash
docker compose up -d ai-chatbot ai-ticket-ocr ai-ekyc
docker compose up -d --build ai-ticket-ocr
docker compose restart ai-ticket-ocr
docker compose stop ai-ticket-ocr
```

AI Ticket OCR runs as the unprivileged `daiphat` user with one Uvicorn worker,
2 CPUs and 4 GB RAM by default. Override the latter two with
`LOCAL_TICKET_VISION_CPUS` and `LOCAL_TICKET_VISION_MEMORY`. OCR model downloads
persist in the `ai_ticket_ocr_model_cache` volume, while the local
`ai-ticket-ocr/models/` directory is mounted read-only so replacing `best.pt`
only requires restarting `ai-ticket-ocr`.

## Production

Each service is published as an immutable image tagged with the commit SHA and
reachable only on the internal Docker network. Blue/green slots, gateways and
Dozzle names are defined in `docker-compose.ai.yml`:

| Service | Image | Containers (Dozzle) | Internal URL | CI / CD workflows |
|---------|-------|---------------------|--------------|-------------------|
| AI Chatbot | `daiphat-ai-chatbot` | `daiphat-ai-chatbot-{blue,green,gateway}` | `http://ai-gateway:8000` after bootstrap | `ai-chatbot-ci.yml`, `ai-chatbot-deploy.yml` |
| AI Ticket OCR | `daiphat-ai-ticket-ocr` | `daiphat-ai-ticket-ocr-{blue,green,gateway}` | `http://ticket-vision:8090` | `ai-ticket-ocr-ci.yml`, `ai-ticket-ocr-deploy.yml` |
| AI eKYC | `daiphat-ai-ekyc` | `daiphat-ai-ekyc-{blue,green,gateway}` | `http://ekyc-vision:8000` | `ai-ekyc-ci.yml`, `ai-ekyc-deploy.yml` |

The internal hostnames, `TICKET_VISION_*` / `KYC_AI_*` / `EKYC_VISION_*`
variables and VPS slot state (`.ai-deploy/chatbot|ocr|ekyc`) keep their original
names, because the backend and the running slots depend on them.

Each deploy workflow runs only when its own service (or shared deploy tooling)
changes, and can be dispatched manually to build or to redeploy an existing
digest. The currently running chatbot stays at `ai:8000` until its gateway
bootstrap and the separate backend URL migration are complete. See
[AI deployment](../docs/ai-deployment.md).

**Model weights in CD builds.** `models/best.pt` is gitignored. New AI Ticket OCR
builds require the `TICKET_VISION_WEIGHTS_URL` repository secret and
`TICKET_VISION_WEIGHTS_SHA256` Actions variable. Builds stop when the artifact is
missing or does not match its checksum. Existing-image deployments reuse the
weights inside that image. Groq uses YOLO guidance independently of the legacy
`contour`/`generic` strategies.


## License

Internal — DaiPhat Capstone project.
