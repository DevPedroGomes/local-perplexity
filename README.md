# Local Searcher

An AI-powered research assistant that searches the web and synthesizes citation-backed answers from multiple sources. Built around a LangGraph research workflow with Chain-of-Thought query planning, grounded synthesis, and a single self-reflection retry loop. The primary LLM path goes through OpenRouter (currently `deepseek/deepseek-chat`); a Groq direct rollback path is retained behind `LLM_PROVIDER=groq`.

**Live demo:** [searcher.pgdev.com.br](https://searcher.pgdev.com.br)

---

## Overview

Local Searcher is split into two services:

- **Backend** — FastAPI (Python 3.11) exposing `/api/v1/*`. The research pipeline is a LangGraph state machine that plans queries, fans out to Tavily, synthesizes a grounded response, self-reflects, optionally rewrites once, and streams tokens out via SSE.
- **Frontend** — Next.js 16 / React 19 / TypeScript / Tailwind v4 / shadcn-ui. Consumes the SSE stream and progressively renders status, queries, source cards, and the answer.

Two orthogonal abuse-control layers gate every search request before the agent runs: an in-memory per-session rate limiter (with IP-bound ownership) and a per-IP rate limiter that survives session rotation. Behind Traefik in production, a global rate limit middleware adds a third outer ring.

---

## Architecture

```mermaid
flowchart TD
    User[User] -->|HTTPS| FE[Next.js 16 frontend<br/>SSE consumer]
    FE -->|"POST /api/v1/search/stream"| Traefik
    Traefik -->|"global-ratelimit<br/>strip-server-header<br/>HSTS + security headers"| BE[FastAPI backend]

    BE --> IPRL[IP rate limiter<br/>15 req / hour<br/>8s cooldown]
    IPRL --> SM[Session manager<br/>5 searches / session<br/>10s cooldown<br/>creator_ip ownership check]
    SM -->|allowed| LG[LangGraph workflow<br/>ReportState]

    subgraph LG[LangGraph: ReportState]
      direction TB
      BQ[build_queries<br/>Chain-of-Thought] --> SA[search_all]
      SA --> GW[grounded_writer<br/>streams tokens]
      GW --> SR{self_reflect}
      SR -->|PASS| FIN[finalize<br/>append references]
      SR -->|NEEDS_IMPROVEMENT<br/>iter <= 1| IR[improve_response<br/>streams replacement]
      IR --> FIN
    end

    BQ -.structured output.-> LLM
    GW -.stream.-> LLM
    SR -.structured output.-> LLM
    IR -.stream.-> LLM
    SA -.parallel queries.-> Tavily[Tavily API<br/>search_depth=advanced<br/>topic=news|general]

    LLM[langchain-openai ChatOpenAI<br/>base_url=openrouter.ai/api/v1] -->|primary| OR[OpenRouter<br/>deepseek/deepseek-chat]
    LLM -. rollback: LLM_PROVIDER=groq .-> Groq[langchain-groq ChatGroq]

    FIN -->|SSE events| FE
```

The Chain-of-Thought + Self-Reflection loop is the core algorithmic shape: the LLM first reasons about how to decompose the question, then writes the answer grounded only in retrieved sources, then judges its own draft. A `NEEDS_IMPROVEMENT` verdict triggers exactly one rewrite (`MAX_REFLECTION_ITERATIONS = 1`), so worst case is four LLM calls plus an optional follow-up suggestion call.

---

## Research Workflow

The graph is built in `app/services/research_agent.py` against the `ReportState` schema (`app/core/schemas.py`).

```
START -> build_queries -> search_all -> grounded_writer -> self_reflect
                                                              |
                                              +---------------+---------------+
                                              | PASS                          | NEEDS_IMPROVEMENT
                                              v                               v
                                          finalize                   improve_response
                                              |                               |
                                              v                               v
                                             END <-----------------------------
```

**Nodes**

1. `build_queries` — `QUERY_GENERATION_PROMPT` with structured output (`QueryList`). Decomposes the user question into 3-5 diverse, searchable queries using Chain-of-Thought.
2. `search_all` — Iterates the generated queries against Tavily (`search_depth=advanced`, `max_results=TAVILY_MAX_RESULTS`). Auto-detects news intent (keywords like `latest`, `2025`, `2026`, `new`, `release`...) to switch `topic=news`. Deduplicates by URL and sorts results by `published_date` descending.
3. `grounded_writer` — `GROUNDED_SYNTHESIS_PROMPT`. Writes a citation-anchored answer (`[1]`, `[2]`...) using only the retrieved snippets. In streaming mode tokens are yielded as `event: content` SSE frames as they are produced.
4. `self_reflect` — `SELF_REFLECTION_PROMPT` with structured output (`ReflectionResult`: `verdict` ∈ `{PASS, NEEDS_IMPROVEMENT}`, `issues`).
5. `improve_response` *(conditional)* — `IMPROVE_RESPONSE_PROMPT`. Streams a fresh draft. The first SSE token carries `replace: true` so the UI clears the previous draft before re-rendering.
6. `finalize` — Appends a `**References:**` block built from `queries_results`.

After `done`, the agent fires `FOLLOW_UP_QUESTIONS_PROMPT` (structured output, capped at 3 questions). Failures here are silently swallowed — follow-ups are best-effort.

**State** (`ReportState`, Pydantic v2):

```
user_input, queries[], queries_results[], draft_response,
reflection_verdict, reflection_issues, final_response, iteration_count
```

`queries_results` uses `Annotated[..., operator.add]` so node returns merge into the accumulator instead of overwriting.

**SSE event vocabulary** emitted by `search_stream`:

| Event       | Data                                                                |
| ----------- | ------------------------------------------------------------------- |
| `session`   | `session_id`, `remaining_searches`                                   |
| `status`    | `message`, `step` (`init`/`queries`/`search`/`synthesis`/`reflection`/`improvement`), optional `provider`, `current`, `total` |
| `queries`   | `queries[]`, `count`                                                 |
| `source`    | `title`, `url`, `resume` (truncated to 300 chars)                    |
| `content`   | `token`; optional `replace: true` (clear UI) or `done: true`         |
| `done`      | `sources_count`, `queries_count`, `reflection_verdict`, `provider`   |
| `follow_up` | `questions[]` (up to 3)                                              |
| `error`     | `message` (sanitized in production)                                  |

The streaming endpoint enforces a 5-minute hard cap on the SSE generator regardless of LLM behavior.

---

## Tech Stack

### Backend (`requirements.txt`)

| Component            | Version constraint           | Role                                                     |
| -------------------- | ---------------------------- | -------------------------------------------------------- |
| `fastapi`            | `>=0.115,<1.0`               | HTTP API + SSE                                           |
| `uvicorn[standard]`  | `>=0.30,<1.0`                | ASGI server                                              |
| `pydantic`           | `>=2.9,<3.0`                 | Schemas + structured LLM output                          |
| `pydantic-settings`  | `>=2.5,<3.0`                 | Env-driven config                                        |
| `langchain`          | `>=0.3,<0.4`                 | Core abstractions (messages, runnables)                  |
| `langgraph`          | `>=0.2.34,<1.0`              | Research workflow state machine                          |
| `langchain-openai`   | `>=0.2,<1.0`                 | `ChatOpenAI` pointed at OpenRouter (OpenAI-compat)        |
| `langchain-groq`     | `>=0.2,<1.0`                 | Rollback path (`LLM_PROVIDER=groq`)                      |
| `tavily-python`      | `>=0.5,<1.0`                 | Web search                                               |
| `httpx`              | `>=0.27,<1.0`                | HTTP client                                              |

Python: 3.11 slim base image.

### Frontend (`package.json`)

| Component                     | Version       | Role                                            |
| ----------------------------- | ------------- | ----------------------------------------------- |
| `next`                        | `16.1.4`      | App Router, standalone output                   |
| `react` / `react-dom`         | `19.2.3`      | UI runtime                                      |
| `typescript`                  | `5.9.3`       | Type checking                                   |
| `tailwindcss` / `@tailwindcss/postcss` | `^4`     | Styling                                         |
| `react-markdown` + `rehype-sanitize` | `^10` / `^6` | Render assistant output safely                   |
| `dompurify`                   | `^3.3.1`      | Defense-in-depth sanitization of HTML fragments |
| `lucide-react`                | `^0.562`      | Icons                                           |
| `@radix-ui/*`                 | latest        | shadcn-ui primitives (avatar, scroll, tooltip…) |

### Infrastructure

- **Reverse proxy:** Traefik v3 (network `proxy`), Let's Encrypt resolver `letsencrypt`, file-provider middlewares `global-ratelimit@file` and `strip-server-header@file` chained on every router.
- **Containerization:** Docker Compose, `searcher-backend` + `searcher-frontend`, internal bridge network for backend.
- **Domain:** `searcher.pgdev.com.br` (HTTPS only).

---

## LLM Provider

The provider is selected at startup from `LLM_PROVIDER`:

- **`openrouter`** *(default)* — `langchain-openai.ChatOpenAI` configured with `base_url=https://openrouter.ai/api/v1`, `model=LLM_MODEL` (default `deepseek/deepseek-chat`), `temperature=0.1`, `timeout=120`, `max_retries=2`. Sends `HTTP-Referer` and `X-Title` headers (OpenRouter attribution). Upstream provider failover (DeepSeek/Llama/Gemini/Anthropic) is handled inside OpenRouter — no fallback bookkeeping is needed in this codebase.
- **`groq`** *(rollback)* — `langchain-groq.ChatGroq` with `GROQ_MODEL` (default `llama-3.3-70b-versatile`), `temperature=0.1`, `timeout=30`. Use this if OpenRouter is degraded; set both `LLM_PROVIDER=groq` and `GROQ_API_KEY`.

The previous Groq+DeepSeek dual-path with recovery counters and fallback locks (~120 LOC) was removed in commit `de044ee` — OpenRouter absorbs that responsibility upstream. The `LLMProvider` wrapper now exposes only `invoke`, `invoke_structured`, `stream`, and `get_provider_name`.

If neither `OPENROUTER_API_KEY` (when `LLM_PROVIDER=openrouter`) nor `GROQ_API_KEY` (when `LLM_PROVIDER=groq`) is set, startup fails fast with a configuration error.

---

## Security & Rate Limits

### Layered rate limiting

| Layer              | Where                                                       | Default limits                        | Bypassable?                          |
| ------------------ | ----------------------------------------------------------- | ------------------------------------- | ------------------------------------ |
| Global             | Traefik `global-ratelimit@file`                             | platform-wide                         | No                                   |
| Per-IP             | `app/services/ip_rate_limiter.py`                           | 15 searches / hour, 8s cooldown        | No (IP-bound)                        |
| Per-session        | `app/services/session_manager.py`                           | 5 searches / session, 10s cooldown, 30 min idle TTL, 35 concurrent sessions max | Yes (incognito / clear localStorage) — caught by per-IP layer |

Both per-IP and per-session limits run before search execution. Exceeding either returns HTTP 429 with `wait_seconds`. The IP record store auto-prunes stale entries every 100 checks (entries older than 2× the window).

### Trusted-proxy IP extraction

`_get_client_ip` reads the **first** entry of `X-Forwarded-For` because Traefik (configured with trustedIPs at the entry point) overwrites that header before forwarding — so the first hop is the genuine client. Falls back to `request.client.host`. The previous logic that preferred `X-Real-IP` and the **last** `X-Forwarded-For` entry was user-controllable and was removed in commit `de044ee`.

### Session ownership

`SessionManager.validate_session_owner(session_id, client_ip)` is required on `GET /session/{id}` and `DELETE /session/{id}`. If the session has no recorded `creator_ip`, ownership is **denied** (fail-closed) — closing a path where uninitialized sessions could be claimed by anyone. `creator_ip` is recorded at session creation.

### CORS

`allow_credentials=False`. In `ENV=development`, origins are wildcarded for local DX. In `ENV=production`, only origins from `BACKEND_CORS_ORIGINS` (JSON array) are allowed. No cookies are used by the API.

### Error sanitization

`app/core/errors.py:sanitize_error_message` returns the raw exception in development and a generic `"An internal error occurred. Please try again."` in production. Used uniformly in the search routes and stream generator so LLM/Tavily error text never reaches end users.

### Container hardening

- **Backend Dockerfile:** non-root user `app` (uid/gid `10001`), `PYTHONPYCACHEPREFIX=/tmp/pycache` (writable to tmpfs), uvicorn `--workers 1` (memory-fit).
- **docker-compose backend:** `security_opt: no-new-privileges:true`, `cap_drop: [ALL]`, `tmpfs: /tmp`, 2 GB memory cap, JSON log rotation (10 MB × 3).
- **Traefik routers:** chain `searcher-security@docker` (HSTS preload, contentTypeNosniff, browserXssFilter, frameDeny, strict-origin-when-cross-origin), `global-ratelimit@file`, `strip-server-header@file`.
- **Frontend:** `poweredByHeader: false` in `next.config.ts`, output `standalone`.

### XSS

The frontend sanitizes all assistant-generated HTML with **DOMPurify** before mounting and uses `rehype-sanitize` inside `react-markdown`. Citations and references are rendered through markdown — no raw HTML escape hatches.

---

## API Reference

| Method   | Endpoint                       | Purpose                                                |
| -------- | ------------------------------ | ------------------------------------------------------ |
| `GET`    | `/api/v1/health`               | Liveness + active session count                        |
| `GET`    | `/api/v1/limits`               | Current rate limit configuration                       |
| `POST`   | `/api/v1/search`               | Synchronous research (full response in JSON)           |
| `POST`   | `/api/v1/search/stream`        | SSE-streamed research (recommended)                    |
| `GET`    | `/api/v1/session/{id}`         | Session info; requires IP ownership                    |
| `DELETE` | `/api/v1/session/{id}`         | Delete session; requires IP ownership                  |

OpenAPI docs are exposed at `/docs` and `/redoc` only when `ENV=development`.

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 20+
- API keys:
  - **OpenRouter** *(required for default path)* — [openrouter.ai](https://openrouter.ai)
  - **Tavily** *(required)* — [tavily.com](https://tavily.com) (free tier: 1000 searches/month)
  - **Groq** *(optional rollback path)* — [console.groq.com](https://console.groq.com)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set OPENROUTER_API_KEY and TAVILY_API_KEY in .env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1' > .env.local
npm run dev
```

Frontend on `http://localhost:3000`, backend on `http://localhost:8000`. CORS is permissive in development.

---

## Deployment

The project ships with a Compose stack designed for the `pgdev.com.br` VPS (Traefik on the external `proxy` network, Let's Encrypt resolver `letsencrypt`).

```bash
# 1. DNS A record for searcher.pgdev.com.br -> server IP
# 2. Configure environment
cp backend/.env.example .env
# Set ENV=production
# Set LLM_PROVIDER=openrouter, OPENROUTER_API_KEY=...
# Set TAVILY_API_KEY=...
# Set BACKEND_CORS_ORIGINS=["https://searcher.pgdev.com.br"]

# 3. Deploy
docker compose up -d
```

Services:

- **`searcher-backend`** — port 8000 (`PathPrefix(/api)`, router priority 10), 2 GB memory cap, hardened (`no-new-privileges`, `cap_drop: ALL`, `tmpfs: /tmp`).
- **`searcher-frontend`** — port 3000 (catch-all router, priority 1), 512 MB memory cap, builds with `NEXT_PUBLIC_API_URL` baked in via build arg.

Healthchecks: backend hits `http://127.0.0.1:8000/api/v1/health` (Python urllib); frontend hits `http://127.0.0.1:3000` (`wget`). Both routers chain `searcher-security@docker`, `global-ratelimit@file`, `strip-server-header@file`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                          | Default                          | Required                                 | Description                                              |
| --------------------------------- | -------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `ENV`                             | `development`                    | No                                       | `development` or `production` (toggles CORS, docs, error sanitization) |
| `LLM_PROVIDER`                    | `openrouter`                     | No                                       | `openrouter` *(default)* or `groq` *(rollback)*           |
| `LLM_MODEL`                       | `deepseek/deepseek-chat`         | No                                       | OpenRouter model id (used when `LLM_PROVIDER=openrouter`) |
| `OPENROUTER_API_KEY`              | —                                | Yes (when `LLM_PROVIDER=openrouter`)     | OpenRouter API key                                       |
| `OPENROUTER_BASE_URL`             | `https://openrouter.ai/api/v1`   | No                                       | OpenRouter base URL                                      |
| `OPENROUTER_REFERER`              | `https://searcher.pgdev.com.br`  | No                                       | Sent as `HTTP-Referer` header                            |
| `OPENROUTER_TITLE`                | `qa-pgdev local-perplexity`      | No                                       | Sent as `X-Title` header                                 |
| `GROQ_API_KEY`                    | —                                | Yes (when `LLM_PROVIDER=groq`)           | Rollback path key                                        |
| `GROQ_MODEL`                      | `llama-3.3-70b-versatile`        | No                                       | Rollback path model                                      |
| `TAVILY_API_KEY`                  | —                                | Yes                                      | Tavily API key                                           |
| `TAVILY_MAX_RESULTS`              | `5`                              | No                                       | Results per generated query                              |
| `MAX_CONCURRENT_SESSIONS`         | `35`                             | No                                       | Max simultaneous sessions held in memory                 |
| `SESSION_TIMEOUT_MINUTES`         | `30`                             | No                                       | Idle TTL before a session is purged                      |
| `MAX_SEARCHES_PER_SESSION`        | `5`                              | No                                       | Per-session quota                                        |
| `MIN_SECONDS_BETWEEN_SEARCHES`    | `10`                             | No                                       | Per-session cooldown                                     |
| `IP_MAX_SEARCHES_PER_WINDOW`      | `15`                             | No                                       | Max searches per IP per window                           |
| `IP_WINDOW_SECONDS`               | `3600`                           | No                                       | IP rate limit window (1 hour)                            |
| `IP_MIN_SECONDS_BETWEEN_SEARCHES` | `8`                              | No                                       | Per-IP cooldown                                          |
| `BACKEND_CORS_ORIGINS`            | `["http://localhost:3000", "http://127.0.0.1:3000"]` | No                  | Allowed origins in production (JSON array)               |

### Frontend (`frontend/.env.local`)

| Variable              | Default                            | Description           |
| --------------------- | ---------------------------------- | --------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1`     | Backend API base URL  |

In production this is baked at build time via the Compose `args:` block (`NEXT_PUBLIC_API_URL=https://searcher.pgdev.com.br/api/v1`).
