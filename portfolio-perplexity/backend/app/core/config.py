from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Perplexity Clone - Research Agent"

    # Environment: "development" or "production"
    ENV: str = "development"

    # CORS - In production, only allow specified origins
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # LLM Configuration - Primary: Cerebras (fast, free tier)
    CEREBRAS_API_KEY: str = ""
    CEREBRAS_MODEL: str = "llama-3.3-70b"  # Fast inference, free tier 1M tokens/day
    # Alternative Cerebras models:
    # - llama-3.3-70b (best quality, 450 tok/s)
    # - llama3.1-8b (faster, 1800 tok/s)

    # LLM Configuration - Fallback: DeepSeek (cheapest when exceeding free tier)
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"  # DeepSeek V3, $0.07/M input tokens
    # Alternative DeepSeek models:
    # - deepseek-chat (V3, fast, cheap)
    # - deepseek-reasoner (R1, better reasoning, slower)

    # Tavily API
    TAVILY_API_KEY: str = ""
    TAVILY_MAX_RESULTS: int = 5  # Results per query (was 1, now 5 for better coverage)

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
