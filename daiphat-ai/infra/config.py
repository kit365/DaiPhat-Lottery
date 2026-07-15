from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ignore_extra: monorepo .env có nhiều biến BE không thuộc chat-bot
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "DaiPhat AI Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/v1"

    # Placeholder for future config
    # CHROMA_DB_PATH: str = "./data/chroma"
    # FASTTEXT_MODEL_PATH: str = "./data/models/intent_model.bin"


settings = Settings()
