from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import ocr_router, liveness_router, face_router, health_router
from app.core.logging_config import configure_logging
from app.core.config import settings

def create_app() -> FastAPI:
    # Setup logging
    configure_logging()
    
    app = FastAPI(
        title="DaiPhat eKYC Vision",
        description="CCCD OCR, liveness, and face verification for Street Agent and Prize Payout",
        version="1.1.0",
    )
    
    # CORS
    if settings.cors_origins:
        origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    # Include routers
    app.include_router(ocr_router.router)
    app.include_router(liveness_router.router)
    app.include_router(face_router.router)
    app.include_router(health_router.router)
    
    return app
