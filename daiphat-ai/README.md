# daiphat-ai

Python monorepo for DaiPhat AI services (computer vision, OCR, analytics).

**Jira:** [DP-269](https://jira.atlassian.com) — Thêm mới vé số bằng Camera

## Role in the platform

`daiphat-ai/` is a sibling folder to `daiphat-be/` (Java) and `daiphat_mobile/` (Flutter).
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
| `services/ticket-vision/` | Camera ticket scan (DP-269) — Phase 1 |
| `contracts/` | OpenAPI specs shared with Java and mobile |
| `infra/` | Docker, model download scripts |
| `scripts/` | Dev and lint helpers |

## Conventions

- **libs/** = reusable code imported by services
- **services/** = independent FastAPI apps with own `Dockerfile`
- Mobile calls Java; Java calls Python (not direct mobile → Python)

## Roadmap (DP-269)

| Phase | Scope |
|-------|-------|
| 0 (current) | Monorepo skeleton |
| 1 | FastAPI `ticket-vision` + `/health` + `/v1/scan` |
| 2 | YOLO train pipeline + PaddleOCR |
| 3 | Java `core-api` integration + Flutter scan UI |

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


## License

Internal — DaiPhat Capstone project.
