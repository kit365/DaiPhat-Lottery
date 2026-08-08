# daiphat-ai

Python monorepo for DaiPhat AI services (computer vision, OCR, analytics).

**Jira:** [DP-269](https://jira.atlassian.com) — Thêm mới vé số bằng Camera

## Role in the platform

`daiphat-ai/` is a sibling folder to `daiphat-be/` (Java), `daiphat-fe/` (React) and `daiphat_mobile/` (Flutter).
Java `core-api` orchestrates business rules, auth, and DB; Python services handle inference only.

```
DaiPhat-Lottery-Platform/
├── daiphat-be/       # Spring Boot — API, validation, persistence
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
| 1 | FastAPI `ticket-vision` + `/health` + `/v1/scan`: OpenCV contour detection (MVP), EasyOCR with a PaddleOCR fallback strategy, station fuzzy matching, Layer-1 format validation, green/yellow/red status resolution | Done — not yet calibrated against real ticket photos (see `services/ticket-vision/fixtures/README.md`); not yet wired into production CD (`docker-compose.prod.yml` / `ai-deploy.yml`) |
| 2 | Fine-tuned YOLOv8 detector for overlapping/cluttered photos; per-station OCR region layouts | Not started — `TicketDetectorFactory`/`LayoutStrategyFactory` are the seams it plugs into |
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

Production publishes `daiphat-ai` (chat-bot) as an immutable image tagged with the same commit SHA as FE and BE, reachable internally at `http://ai:8000` — not exposed publicly on the VPS. `ticket-vision` doesn't have a production image/deploy pipeline yet (`ai-deploy.yml` only builds chat-bot, and it has no entry in `docker-compose.prod.yml`); that needs to be set up before this feature can run in production.


## License

Internal — DaiPhat Capstone project.
