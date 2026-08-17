# daiphat-ai

Python monorepo for DaiPhat AI services (computer vision, OCR, chatbot analytics, fortune).

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

## Folder structure

| Path | Purpose |
|------|---------|
| `libs/` | Shared internal packages (OCR wrappers, schemas, vision utils) |
| `services/` | One deployable microservice per feature |
| `services/chat-bot/` | NLP intent classification for the web chat widget |
| `services/ticket-vision/` | Camera ticket scan (DP-269) — Phase 1, port 8090 |
| `contracts/` | Response envelopes shared with Java and mobile (`APIResponse`) |
| `infra/` | Shared runtime config (`config.py` `Settings`) and logging |
| `scripts/` | Dev run helpers (`run_chat_bot.sh`, `run_ticket_vision.sh`) |

## Conventions

- **libs/** = reusable code imported by services
- **services/** = independent FastAPI apps, each with `main.py` at the service
  root as its entrypoint (`uvicorn main:app --app-dir services/<name>`),
  `domain/` for business code, `dto/request` + `dto/response` for wire types,
  and `test_*.py` flat at the service root
- Shared `contracts/`, `infra/`, `libs/` are resolved from the `daiphat-ai/`
  root via `PYTHONPATH`, never copied into a service
- Mobile calls Java; Java calls Python (not direct mobile → Python)

## Roadmap (DP-269)

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Monorepo skeleton | Done |
| 1 | FastAPI `ticket-vision` + `/health` + `/v1/scan`: OpenCV contour detection (MVP), EasyOCR with a PaddleOCR fallback strategy, station fuzzy matching, Layer-1 format validation, green/yellow/red status resolution | Done — not yet calibrated against real ticket photos (see `services/ticket-vision/fixtures/README.md`) |
| 2 | Fine-tuned YOLOv8 detector for overlapping/cluttered photos; per-station OCR region layouts | Done, off by default — `YoloObbTicketDetector` (`TICKET_VISION_DETECTOR_STRATEGY=yolov8_obb`) and `YoloFieldLayoutStrategy` (`TICKET_VISION_LAYOUT_STRATEGY=yolo_field`). Both need `models/best.pt`; they fall back to contour/generic without it. Not yet benchmarked against the MVP, so the defaults stay unchanged |
| 3 | Java `core-api` integration + Flutter scan UI | Java side done (`TicketVisionAdapter` → `POST /v1/scan`, Layer-2 business validation in `TicketScanImportService`); Flutter scan UI not started |

## Local setup

> Bạn đã đứng trong folder `daiphat-ai` rồi thì **không** `cd daiphat-ai` nữa.
> **Không** dùng `pip install -e .` (package chưa cấu hình sẵn). Dùng lệnh bên dưới.

```bash
# Nếu đang ở DaiPhat-Lottery-Platform:
cd daiphat-ai

python3 -m venv .venv
source .venv/bin/activate          # macOS/Linux
# Windows: .venv\Scripts\activate

python -m pip install -r services/chat-bot/requirements.txt
```

### Run chat-bot (port 8000 — khớp Java `daiphat.chat.ai.service.base-url`)

```bash
# Cách 1 (khuyên dùng) — từ trong daiphat-ai, đã activate .venv cũng được:
./scripts/run_chat_bot.sh

# Cách 2 — bấm Run file services/chat-bot/main.py trong IDE
# Cách 3:
# source .venv/bin/activate
# export PYTHONPATH="$(pwd):$(pwd)/services/chat-bot"
# uvicorn main:app --app-dir services/chat-bot --host 127.0.0.1 --port 8000 --reload
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

### Run ticket-vision (port 8090)

```bash
python -m pip install -r services/ticket-vision/requirements.txt
./scripts/run_ticket_vision.sh
```

> EasyOCR/PaddleOCR pull in a full ML framework each (torch, paddlepaddle) —
> the first install and the first `/v1/scan` call (model download + load)
> are noticeably slower than chat-bot's.

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

See `services/ticket-vision/` for the full pipeline (detection → preprocessing →
OCR → parsing → validation → status) and its test suite.

## Docker

From the repository root, the standard local stack builds and starts both AI services (`ai` = chat-bot on 8000, `ticket-vision` on 8090) alongside PostgreSQL, Redis, backend and frontend:

```bash
docker compose up -d --build
```

Production publishes each service as an immutable image tagged with the same commit SHA as FE and BE, reachable only on the internal Docker network — neither is exposed publicly on the VPS:

| Service | Image | Internal URL | Workflow |
|---------|-------|--------------|----------|
| chat-bot | `daiphat-ai` | `http://ai:8000` | `ai-deploy.yml` |
| ticket-vision | `daiphat-ticket-vision` | `http://ticket-vision:8090` | `ticket-vision-deploy.yml` |

They deploy independently: `ticket-vision`'s image carries torch/paddlepaddle/easyocr and is far slower to build, so `ai-deploy.yml` excludes its subtree rather than rebuilding it on every chat-bot change.

**Model weights in CI.** `models/best.pt` is gitignored, so a CI checkout has none and the image ships without YOLO — `TicketDetectorFactory` and `LayoutStrategyFactory` fall back to the contour detector and the generic layout on their own. To bake the weights in, set the `TICKET_VISION_WEIGHTS_URL` repository secret to a downloadable `best.pt`; the build validates size and file type so a bad URL fails the build instead of shipping an HTML error page as "weights". Production defaults to `contour`/`generic` regardless — flip `TICKET_VISION_DETECTOR_STRATEGY` / `TICKET_VISION_LAYOUT_STRATEGY` only after benchmarking.


## License

Internal — DaiPhat Capstone project.
