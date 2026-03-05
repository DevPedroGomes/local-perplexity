from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Local Searcher - AI-Powered Research"

    # Environment: "development" or "production"
    ENV: str = "development"

    # CORS - In production, only allow specified origins
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # LLM Configuration - Primary: Groq (fastest, free tier)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"  # Ultra-fast inference, free tier
    # Alternative Groq models:
    # - llama-3.3-70b-versatile (best quality, ~750 tok/s)
    # - llama-3.1-70b-versatile (great quality, ~800 tok/s)
    # - llama-3.1-8b-instant (faster, ~1300 tok/s)
    # - mixtral-8x7b-32768 (good for long context)

    # LLM Configuration - Fallback: DeepSeek (cheapest paid option)
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

    # Rate Limiting & Abuse Prevention (per session)
    MAX_SEARCHES_PER_SESSION: int = 5  # Max searches per session (quota)
    MIN_SECONDS_BETWEEN_SEARCHES: int = 10  # Cooldown between searches

    # IP-based Rate Limiting (prevents session bypass)
    IP_MAX_SEARCHES_PER_WINDOW: int = 15  # Max searches per IP per window
    IP_WINDOW_SECONDS: int = 3600  # Window duration (1 hour)
    IP_MIN_SECONDS_BETWEEN_SEARCHES: int = 8  # Min seconds between searches from same IP

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
