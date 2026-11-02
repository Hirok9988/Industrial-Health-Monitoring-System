from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = "firebase-credentials.json"
    
    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    ENVIRONMENT: str = "development"
    
    # CORS (Comma separated list of origins)
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"

settings = Settings()
