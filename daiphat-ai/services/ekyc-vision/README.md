# DaiPhat eKYC Vision

FastAPI microservice for Vietnamese CCCD eKYC: OCR (`/internal/v1/ocr/id-card`),
face match (`/internal/v1/face/verify`), and liveness (`/internal/v1/liveness`).

Ported from EduSpace `eduspace-ai-service` and kept API-compatible so the Spring
`EkycAiAdapter` can call the same paths with `X-API-Key`.

## Local run

```bash
cd daiphat-ai/services/ekyc-vision
pip install -r requirements.txt
export KYC_AI_API_KEY=dev-kyc-ai-secret
uvicorn app.main:app --host 0.0.0.0 --port 8091
```

## Docker Compose

Service name: `ekyc-vision` (port `8091`). Backend env:
`DAIPHAT_EKYC_AI_BASE_URL=http://ekyc-vision:8091`.
