from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Perplexity Clone - Research Agent"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # LLM Configuration (Groq)
    GROQ_API_KEY: str = ""
    LLM_MODEL: str = "llama-3.1-8b-instant"  # Fast model for low latency
    # Alternative models:
    # - llama-3.1-70b-versatile (better quality, slower)
    # - llama-3.1-8b-instant (faster, good for most tasks)
    # - mixtral-8x7b-32768 (good balance)

    # Tavily API
    TAVILY_API_KEY: str = ""

    # Session Configuration
    MAX_CONCURRENT_SESSIONS: int = 35
    SESSION_TIMEOUT_MINUTES: int = 30

    # Rate Limiting & Abuse Prevention
    MAX_SEARCHES_PER_SESSION: int = 5  # Max searches per session (quota)
    MIN_SECONDS_BETWEEN_SEARCHES: int = 10  # Cooldown between searches

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
