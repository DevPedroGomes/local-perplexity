export interface Source {
  title: string;
  url: string;
  resume: string;
}

export interface SearchResponse {
  session_id: string;
  query: string;
  response: string;
  sources: Source[];
  created_at: string;
  remaining_searches: number;
}

export interface StreamEvent {
  event: 'session' | 'status' | 'queries' | 'source' | 'content' | 'done' | 'error';
  data: {
    session_id?: string;
    remaining_searches?: number;
    message?: string;
    step?: string;
    current?: number;
    total?: number;
    queries?: string[];
    count?: number;
    title?: string;
    url?: string;
    resume?: string;
    response?: string;
    token?: string;
    done?: boolean;
    replace?: boolean;
    sources_count?: number;
    queries_count?: number;
    provider?: string;
    reflection_verdict?: string;
  };
}

export interface HealthResponse {
  status: string;
  active_sessions: number;
  max_sessions: number;
}

export interface RateLimitError {
  message: string;
  wait_seconds: number | null;
  session_id: string;
}

export interface LimitsResponse {
  max_searches_per_session: number;
  min_seconds_between_searches: number;
  session_timeout_minutes: number;
  max_concurrent_sessions: number;
}

export type SearchStatus = 'idle' | 'generating-queries' | 'searching' | 'synthesizing' | 'reflecting' | 'improving' | 'complete' | 'error' | 'rate-limited' | 'quota-exceeded';
