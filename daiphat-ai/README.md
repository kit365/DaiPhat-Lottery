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

## Local setup (Phase 1+)

```bash
cd daiphat-ai
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -e .
```

## License

Internal — DaiPhat Capstone project.
