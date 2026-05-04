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

    # LLM Configuration
    # Primary path: OpenRouter (aggregator — DeepSeek/Llama/Gemini/Anthropic via single key)
    # Fallback path: Groq direct (kept for rollback; if OPENROUTER_API_KEY is set, OpenRouter wins)
    LLM_PROVIDER: str = "openrouter"  # "openrouter" | "groq"
    LLM_MODEL: str = "deepseek/deepseek-chat"  # OpenRouter model id
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_REFERER: str = "https://searcher.pgdev.com.br"
    OPENROUTER_TITLE: str = "qa-pgdev local-perplexity"

    # Legacy Groq config (kept so we can flip back via LLM_PROVIDER=groq if needed)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

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
