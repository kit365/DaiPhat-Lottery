from fastapi import FastAPI

from contracts.api_response import APIResponse
from infra.config import settings
from routers.scan import router as scan_router

app = FastAPI(
    title="DaiPhat Ticket Vision Service",
    description="Image preprocessing, ticket detection and OCR for lottery ticket scanning (DP-269).",
    version=settings.VERSION,
)

app.include_router(scan_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System"])
def health_check():
    return APIResponse.ok(data={"status": "up"})


if __name__ == "__main__":
    import uvicorn

    # Cho phép bấm Run trong IDE: python main.py
    # Swagger: http://127.0.0.1:8090/docs
    uvicorn.run("main:app", host="127.0.0.1", port=8090, reload=True)
