"""Application settings (Spring: application.yml + @Configuration)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="KYC_AI_", extra="ignore")

    api_key: str = ""
    log_level: str = "info"
    host: str = "0.0.0.0"
    port: int = 8000

    # Face verify: retinaface/mtcnn ổn định hơn opencv khi ảnh nghiêng / crop chặt; có thể đổi env KYC_AI_FACE_DETECTOR_BACKEND
    face_detector_backend: str = "retinaface"
    face_expand_percentage: int = 5

    # OCR: ảnh điện thoại 12MP làm Paddle chậm/treo trên CPU — giới hạn cạnh dài trước inference; 0 = tắt resize
    ocr_max_side: int = 1920

    # CORS: FE dev (Vite) gọi trực tiếp — danh sách origin cách nhau bởi dấu phẩy
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:3000,http://127.0.0.1:3000"
    )


settings = Settings()
