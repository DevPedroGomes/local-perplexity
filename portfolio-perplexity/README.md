# Research Agent - Perplexity Clone

AI-powered research assistant that searches the web, extracts content, and synthesizes information from multiple sources into a comprehensive response with citations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────────────┐ │
│  │  SearchBar  │───>│  useSearch   │───>│  SSE Stream Handler             │ │
│  │  Component  │    │    Hook      │    │  (real-time updates)            │ │
│  └─────────────┘    └──────────────┘    └─────────────────────────────────┘ │
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
└─────────────────────────────────────────────────────────────────────────────┘
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

## Advanced Techniques

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
- Add citations immediately after each claim
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
   - **Web Search**: Each query searches Tavily API
   - **Content Extraction**: Raw content extracted from top URLs
   - **Summarization**: LLM summarizes each source focusing on relevance
   - **Grounded Synthesis**: Draft response with strict source attribution
   - **Self-Reflection**: Quality evaluation of the draft
   - **Improvement** (if needed): Fixes issues identified by reflection
   - **Finalize**: Add references and return
4. Results stream back via Server-Sent Events (SSE)

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16, TypeScript, Tailwind v4, shadcn/ui | Modern React UI with streaming support |
| Backend | FastAPI, Python 3.11+ | REST API with SSE streaming |
| Workflow | LangGraph | Multi-step agent orchestration with conditional edges |
| LLM | Groq (llama-3.1-8b-instant) | Fast cloud inference via Groq API |
| Search | Tavily API | Web search and content extraction |
| Session | In-memory with asyncio locks | Multi-user session management |

## Rate Limiting

Implemented to prevent API cost abuse in a demo/portfolio context:

| Limit | Value | Description |
|-------|-------|-------------|
| Searches per session | 5 | Hard quota per session |
| Cooldown | 10 seconds | Minimum time between requests |
| Session timeout | 30 minutes | Inactive session expiration |
| Concurrent sessions | 35 | Maximum simultaneous users |

Rate limit errors return HTTP 429 with remaining wait time.

## Project Structure

```
portfolio-perplexity/
├── backend/
│   ├── app/
│   │   ├── api/routes/search.py      # REST endpoints
│   │   ├── core/
│   │   │   ├── config.py             # Environment settings
│   │   │   ├── prompts.py            # CoT, Grounded, Reflection prompts
│   │   │   └── schemas.py            # Pydantic models with reflection state
│   │   └── services/
│   │       ├── research_agent.py     # LangGraph workflow with self-reflection
│   │       └── session_manager.py    # Rate limiting + sessions
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/page.tsx              # Main search interface
│   │   ├── components/search/        # UI components
│   │   ├── hooks/useSearch.ts        # Search state with reflection status
│   │   ├── lib/api.ts                # API client with SSE
│   │   └── types/index.ts            # TypeScript definitions
│   ├── Dockerfile
│   └── package.json
├── future-improvements.md            # Advanced techniques for future
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
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
- Groq API key (free tier available at https://console.groq.com)
- Tavily API key (free tier available at https://tavily.com)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set GROQ_API_KEY and TAVILY_API_KEY

# Run backend
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
| GROQ_API_KEY | (required) | Groq API key |
| TAVILY_API_KEY | (required) | Tavily API key |
| LLM_MODEL | llama-3.1-8b-instant | Groq model (alternatives: llama-3.1-70b-versatile, mixtral-8x7b-32768) |
| MAX_CONCURRENT_SESSIONS | 35 | Max users |
| MAX_SEARCHES_PER_SESSION | 5 | Quota per session |
| MIN_SECONDS_BETWEEN_SEARCHES | 10 | Cooldown |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_API_URL | http://localhost:8000/api/v1 | Backend URL |

## Deployment (Railway)

1. Create Railway project
2. Add two services from GitHub repository:
   - Backend: set root directory to `/backend`
   - Frontend: set root directory to `/frontend`
3. Configure environment variables for each service
4. Set frontend `NEXT_PUBLIC_API_URL` to backend's Railway URL

Both services include Dockerfiles for containerized deployment.

## License

MIT
