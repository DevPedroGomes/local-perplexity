from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.api import api_router


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.PROJECT_NAME}")
    logger.info(f"Max concurrent sessions: {settings.MAX_CONCURRENT_SESSIONS}")
    logger.info(f"Primary LLM: Groq ({settings.GROQ_MODEL})")
    if settings.DEEPSEEK_API_KEY:
        logger.info(f"Fallback LLM: DeepSeek ({settings.DEEPSEEK_MODEL})")
    yield
    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    ## Local Searcher API

    An AI-powered research assistant that searches the web and synthesizes information
    from multiple sources to provide comprehensive answers.

    ### Features:
    - Multi-query web search with 5 results per query
    - AI-powered content synthesis with source verification
    - Source citations with inline references
    - Multi-user session support (up to 35 concurrent users)
    - Real-time streaming responses
    - Self-reflection loop for quality assurance

    ### Built with:
    - LangGraph for workflow orchestration
    - Groq for ultra-fast LLM inference (free tier)
    - DeepSeek as fallback (cheapest API)
    - Tavily for web search
    - FastAPI for the REST API

    ### Advanced RAG Techniques:
    - Chain-of-Thought query generation
    - Grounded generation (only supported claims)
    - Self-reflection with automatic improvement
    """,
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENV == "development" else None,
    redoc_url="/redoc" if settings.ENV == "development" else None
)

# CORS configuration - Only allow all origins in development
cors_origins = settings.BACKEND_CORS_ORIGINS
if settings.ENV == "development":
    cors_origins = ["*"]  # Allow all in development only

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "2.0.0",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "llm_providers": {
            "primary": f"Groq ({settings.GROQ_MODEL})",
            "fallback": f"DeepSeek ({settings.DEEPSEEK_MODEL})" if settings.DEEPSEEK_API_KEY else None
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
