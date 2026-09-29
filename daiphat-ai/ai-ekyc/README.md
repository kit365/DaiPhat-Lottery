# AI CCCD OCR

FastAPI microservice for reading Vietnamese CCCD fields with OCR
(`/internal/v1/ocr/id-card`). Face match (`/internal/v1/face/verify`) and liveness
(`/internal/v1/liveness`) endpoints are present, but current business flows use
only the CCCD OCR endpoint.

Ported from EduSpace `eduspace-ai-service` and kept API-compatible so the Spring
`EkycAiAdapter` can call the same paths with `X-API-Key`.

## Local run

```bash
cd daiphat-ai/ai-ekyc
pip install -r requirements.txt
export KYC_AI_API_KEY=dev-kyc-ai-secret
uvicorn app.main:app --host 0.0.0.0 --port 8091
```

On Windows, `scripts\run.bat` does the same with the service (or shared
`daiphat-ai`) virtualenv.

## Tests

```bash
cd daiphat-ai/ai-ekyc
PYTHONPATH=. pytest -q
```

## Docker Compose

Local Compose service key: `ai-ekyc`; container name: `daiphat-ai-cccd-ocr`
(host port `8091`, container port `8000`).
Backend env: `DAIPHAT_EKYC_AI_BASE_URL=http://ai-ekyc:8000`.

In production the service runs as blue/green containers
`daiphat-ai-cccd-ocr-{blue,green,gateway}` behind the legacy
`ekyc-vision:8000` gateway alias (see `docker-compose.ai.yml`).
