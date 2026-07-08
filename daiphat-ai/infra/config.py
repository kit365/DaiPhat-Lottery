from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "DaiPhat AI Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/v1"
    
    # Placeholder for future config
    # CHROMA_DB_PATH: str = "./data/chroma"
    # FASTTEXT_MODEL_PATH: str = "./data/models/intent_model.bin"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
