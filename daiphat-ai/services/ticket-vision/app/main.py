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

    # Convenience for "Run" in an IDE. Note: pass the app object directly
    # (not the "app.main:app" string) so this works regardless of the
    # process's working directory / reload isn't needed for a quick check.
    # For local dev with --reload, use scripts/run_ticket_vision.sh instead.
    # Swagger: http://127.0.0.1:8090/docs
    uvicorn.run(app, host="127.0.0.1", port=8090)
