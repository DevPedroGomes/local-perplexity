from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 Starting {settings.PROJECT_NAME}")
    print(f"📊 Max concurrent sessions: {settings.MAX_CONCURRENT_SESSIONS}")
    yield
    # Shutdown
    print("👋 Shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    ## Research Agent API - Perplexity Clone

    An AI-powered research assistant that searches the web and synthesizes information
    from multiple sources to provide comprehensive answers.

    ### Features:
    - Multi-query web search
    - AI-powered content synthesis
    - Source citations with references
    - Multi-user session support (up to 35 concurrent users)
    - Real-time streaming responses

    ### Built with:
    - LangGraph for workflow orchestration
    - Groq for fast LLM inference
    - Tavily for web search
    - FastAPI for the REST API
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS + ["*"],  # Allow all for development
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
        "version": "1.0.0",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
