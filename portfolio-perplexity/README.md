# Research Agent - Perplexity Clone

AI-powered research assistant that searches the web, extracts content, and synthesizes information from multiple sources into a comprehensive response with citations.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![LangGraph](https://img.shields.io/badge/LangGraph-0.2-purple)

## Live Demo

[View Live Demo](https://your-railway-app.railway.app) | [GitHub Repository](https://github.com/DevPedroGomes/local-perplexity)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 16)                          │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────────────┐ │
│  │  SearchBar  │───>│  useSearch   │───>│  SSE Stream Handler             │ │
│  │  Component  │    │    Hook      │    │  (real-time updates)            │ │
│  └─────────────┘    └──────────────┘    └─────────────────────────────────┘ │
│        │                                                                    │
│  ┌─────▼─────────────────────────────────────────────────────────────────┐  │
│  │  Security: DOMPurify (XSS Protection) | Retry on Error | Rate Limits  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP POST /api/v1/search/stream
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (FastAPI)                              │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────────────┐  │
│  │ Session Manager │    │   Rate Limiter   │    │    Research Agent     │  │
│  │ (35 max users)  │    │ (5 req/session)  │    │    (LangGraph)        │  │
│  └─────────────────┘    └──────────────────┘    └───────────────────────┘  │
│        │                                                                    │
│  ┌─────▼─────────────────────────────────────────────────────────────────┐  │
│  │  Security: CORS (env-based) | Error Sanitization | Input Validation   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │  Cerebras   │ │  DeepSeek   │ │   Tavily    │
            │  (primary)  │ │ (fallback)  │ │  (search)   │
            │  Llama 3.3  │ │    V3       │ │  5 results  │
            │  FREE tier  │ │  $0.07/M    │ │  per query  │
            └─────────────┘ └─────────────┘ └─────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LANGGRAPH WORKFLOW (with Self-Reflection)                │
│                                                                             │
│  ┌───────┐   ┌─────────────┐   ┌────────┐   ┌──────────┐   ┌───────────┐  │
│  │ START │──>│ Chain-of-   │──>│ Search │──>│ Grounded │──>│  Self-    │  │
│  │       │   │ Thought     │   │  All   │   │ Writer   │   │ Reflect   │  │
│  └───────┘   │ Queries     │   └────────┘   └──────────┘   └─────┬─────┘  │
│              └─────────────┘                                     │        │
│                                                    ┌─────────────┴──────┐ │
│                                                    │                    │ │
│                                                  PASS            NEEDS_IMPROVE
│                                                    │                    │ │
│                                                    ▼                    ▼ │
│                                              ┌──────────┐        ┌────────┐│
│                                              │ Finalize │<───────│Improve ││
│                                              └────┬─────┘        └────────┘│
│                                                   │                        │
│                                                   ▼                        │
│                                                 [END]                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

- **Multi-provider LLM**: Cerebras (primary, ultra-fast) with DeepSeek fallback and automatic recovery
- **Enhanced Search**: 5 results per query with deduplication for better coverage
- **Advanced RAG**: Chain-of-Thought, Grounded Generation, Self-Reflection
- **Real-time Streaming**: Server-Sent Events (SSE) for live updates
- **Rate Limiting**: Session-based quotas with cooldown protection
- **Security**: XSS protection, CORS configuration, error sanitization
- **Error Recovery**: Automatic retry button and provider failover

## Advanced RAG Techniques

This implementation uses three advanced RAG techniques (zero additional API cost):

### 1. Chain-of-Thought Query Generation

Instead of directly generating queries, the LLM follows a structured reasoning process:

```
1. UNDERSTAND: Identify the core intent of the question
2. IDENTIFY: Extract key concepts and entities
3. CONSIDER: Think about different angles to explore
4. DIVERSIFY: Ensure coverage of facts, opinions, recent news
5. FORMULATE: Write specific, searchable queries
```

### 2. Grounded Generation

The synthesis prompt enforces strict grounding rules:

- Only include information directly supported by sources
- Add citations immediately after each claim `[1]`, `[2]`
- Flag conflicting information from different sources
- Never hallucinate or add unsupported claims

### 3. Self-Reflection Loop

After generating a draft response, the agent evaluates itself:

```
EVALUATION CRITERIA:
- Completeness: Does it answer the question fully?
- Accuracy: Are claims supported by sources?
- Citations: Are they properly placed?
- Clarity: Is it well-structured?
- Gaps: Is important source info missing?

VERDICT: PASS or NEEDS_IMPROVEMENT
```

If issues are found, the response is automatically improved (max 1 iteration to control latency).

## How It Works

1. User submits a question through the frontend
2. Backend validates session and rate limits
3. LangGraph workflow executes:
   - **Query Planning**: Chain-of-Thought reasoning generates 3-5 diverse queries
   - **Web Search**: Each query searches Tavily API (5 results per query)
   - **Content Extraction**: Raw content extracted and deduplicated
   - **Summarization**: LLM summarizes each source focusing on relevance
   - **Grounded Synthesis**: Draft response with strict source attribution
   - **Self-Reflection**: Quality evaluation of the draft
   - **Improvement** (if needed): Fixes issues identified by reflection
   - **Finalize**: Add references and return
4. Results stream back via Server-Sent Events (SSE)
5. On error, user can retry with one click

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui | Modern React UI with streaming |
| Security (FE) | DOMPurify | XSS protection for AI responses |
| Backend | FastAPI, Python 3.11+, Pydantic | REST API with SSE streaming |
| Workflow | LangGraph | Multi-step agent orchestration |
| LLM (Primary) | Cerebras (llama-3.3-70b) | Ultra-fast inference, 1M tokens/day free |
| LLM (Fallback) | DeepSeek (deepseek-chat) | Cheapest API at $0.07/M tokens |
| Search | Tavily API | Web search and content extraction |
| Session | In-memory with asyncio locks | Multi-user session management |

## Security Features

| Feature | Implementation | Description |
|---------|---------------|-------------|
| XSS Protection | DOMPurify | Sanitizes all AI-generated content before rendering |
| CORS | Environment-based | Allows all origins in dev, restricted in production |
| Error Sanitization | Conditional | Full errors in dev, generic messages in production |
| Input Validation | Pydantic | Validates all API requests with length limits |
| URL Sanitization | DOMPurify | Only allows http/https URLs in responses |
| Rate Limiting | Session-based | Prevents API abuse with quotas and cooldowns |

## Rate Limiting

Implemented to prevent API cost abuse in a demo/portfolio context:

| Limit | Value | Description |
|-------|-------|-------------|
| Searches per session | 5 | Hard quota per session |
| Cooldown | 10 seconds | Minimum time between requests |
| Session timeout | 30 minutes | Inactive session expiration |
| Concurrent sessions | 35 | Maximum simultaneous users |
| Results per query | 5 | Tavily results per search query |

Rate limit errors return HTTP 429 with remaining wait time.

## Project Structure

```
portfolio-perplexity/
├── backend/
│   ├── app/
│   │   ├── api/routes/search.py      # REST endpoints with error sanitization
│   │   ├── core/
│   │   │   ├── config.py             # Environment settings (ENV, CORS)
│   │   │   ├── prompts.py            # CoT, Grounded, Reflection prompts
│   │   │   └── schemas.py            # Pydantic models with reflection state
│   │   └── services/
│   │       ├── research_agent.py     # LangGraph workflow with provider recovery
│   │       └── session_manager.py    # Rate limiting + sessions
│   ├── main.py                       # FastAPI app with env-based CORS
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/page.tsx              # Main interface with retry button
│   │   ├── components/search/
│   │   │   ├── ResponseDisplay.tsx   # XSS-safe markdown rendering
│   │   │   └── ...                   # Other search components
│   │   ├── hooks/useSearch.ts        # Search state with retry support
│   │   ├── lib/api.ts                # API client with SSE
│   │   └── types/index.ts            # TypeScript definitions
│   ├── Dockerfile
│   └── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info with LLM providers |
| GET | `/api/v1/health` | Health check with active session count |
| GET | `/api/v1/limits` | Get rate limit configuration |
| POST | `/api/v1/search` | Execute search (returns full response) |
| POST | `/api/v1/search/stream` | Execute search with SSE streaming |
| GET | `/api/v1/session/{id}` | Get session info and remaining quota |
| DELETE | `/api/v1/session/{id}` | Delete session |

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Cerebras API key (free tier: 1M tokens/day at https://cerebras.ai)
- DeepSeek API key (optional fallback at https://platform.deepseek.com)
- Tavily API key (free tier available at https://tavily.com)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set CEREBRAS_API_KEY and TAVILY_API_KEY

# Run backend (development)
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| ENV | development | Environment mode (development/production) |
| CEREBRAS_API_KEY | (required) | Cerebras API key (free tier: 1M tokens/day) |
| CEREBRAS_MODEL | llama-3.3-70b | Cerebras model |
| DEEPSEEK_API_KEY | (optional) | DeepSeek API key for fallback |
| DEEPSEEK_MODEL | deepseek-chat | DeepSeek model |
| TAVILY_API_KEY | (required) | Tavily API key |
| TAVILY_MAX_RESULTS | 5 | Results per search query |
| MAX_CONCURRENT_SESSIONS | 35 | Max users |
| MAX_SEARCHES_PER_SESSION | 5 | Quota per session |
| MIN_SECONDS_BETWEEN_SEARCHES | 10 | Cooldown |
| BACKEND_CORS_ORIGINS | ["http://localhost:3000"] | Allowed origins (production) |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_API_URL | http://localhost:8000/api/v1 | Backend URL |

## Deployment (Railway)

### Quick Deploy

1. Fork this repository to your GitHub account
2. Create a new Railway project
3. Add **Backend** service:
   - New Service → GitHub Repo → Select your fork
   - Root Directory: `portfolio-perplexity/backend`
   - Add environment variables:
     - `ENV=production`
     - `CEREBRAS_API_KEY=your_key`
     - `TAVILY_API_KEY=your_key`
     - `DEEPSEEK_API_KEY=your_key` (optional)
     - `BACKEND_CORS_ORIGINS=["https://your-frontend.railway.app"]`
4. Add **Frontend** service:
   - New Service → GitHub Repo → Select your fork
   - Root Directory: `portfolio-perplexity/frontend`
   - Add environment variable:
     - `NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1`
5. Generate domains for both services

### Production Checklist

- [ ] Set `ENV=production` in backend
- [ ] Configure `BACKEND_CORS_ORIGINS` with your frontend URL
- [ ] Set all required API keys
- [ ] Verify rate limits are appropriate for your use case
- [ ] Test the deployment with a few searches

Both services include optimized Dockerfiles for containerized deployment.

## LLM Provider Strategy

The application uses a smart multi-provider strategy:

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Provider Logic                       │
├─────────────────────────────────────────────────────────────┤
│  1. Try PRIMARY (Cerebras)                                  │
│     ├─ Success → Continue with Cerebras                     │
│     └─ Failure → Switch to FALLBACK (DeepSeek)              │
│                                                             │
│  2. While using FALLBACK:                                   │
│     ├─ Count successful calls                               │
│     └─ After 5 calls → Try PRIMARY again                    │
│        ├─ Success → Return to Cerebras                      │
│        └─ Failure → Continue with DeepSeek                  │
└─────────────────────────────────────────────────────────────┘
```

This ensures:
- Fast responses with Cerebras when available
- Automatic failover to DeepSeek on errors
- Periodic recovery attempts to return to primary
- No manual intervention required

## Cost Estimation

| Component | Free Tier | Paid Usage |
|-----------|-----------|------------|
| Cerebras | 1M tokens/day | $0.60/M tokens |
| DeepSeek (fallback) | - | $0.07/M tokens |
| Tavily | 1000 searches/month | $0.01/search |

For a portfolio demo (~100 searches/day), the free tiers should be sufficient.

## Future Improvements

See [future-improvements.md](future-improvements.md) for planned enhancements:

- [ ] Dark mode toggle
- [ ] Search history persistence
- [ ] Export results (PDF, Markdown)
- [ ] Related questions suggestions
- [ ] Source credibility indicators
- [ ] Redis for session persistence (scaling)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

---

Built with Next.js, FastAPI, LangGraph, Cerebras, DeepSeek, and Tavily.
