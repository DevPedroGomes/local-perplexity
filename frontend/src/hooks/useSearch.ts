'use client';

import { useState, useCallback, useEffect } from 'react';
import { searchQueryStream, getSession } from '@/lib/api';
import { Source, SearchStatus, StreamEvent } from '@/types';

const MAX_SEARCHES = 5;
const COOLDOWN_SECONDS = 10;
const SESSION_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour client-side (server is source of truth)

export interface ThinkingStep {
  id: string;
  label: string;
  detail: string;
  timestamp: number;
}

interface UseSearchReturn {
  search: (query: string) => Promise<void>;
  retry: () => Promise<void>;
  status: SearchStatus;
  statusMessage: string;
  progress: { current: number; total: number } | null;
  queries: string[];
  sources: Source[];
  response: string;
  error: string | null;
  sessionId: string | null;
  remainingSearches: number;
  cooldown: number;
  provider: string | null;
  lastQuery: string | null;
  reflectionVerdict: string | null;
  thinkingSteps: ThinkingStep[];
  followUpQuestions: string[];
  reset: () => void;
}

export function useSearch(): UseSearchReturn {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [queries, setQueries] = useState<string[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remainingSearches, setRemainingSearches] = useState(MAX_SEARCHES);
  const [cooldown, setCooldown] = useState(0);
  const [provider, setProvider] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [reflectionVerdict, setReflectionVerdict] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);

  // Load session from localStorage and sync with backend
  useEffect(() => {
    const raw = localStorage.getItem('research_session');
    if (raw) {
      try {
        const { id, ts } = JSON.parse(raw);
        if (Date.now() - ts > SESSION_MAX_AGE_MS) {
          // Session too old — discard silently, no backend call
          localStorage.removeItem('research_session');
          return;
        }
        setSessionId(id);
        getSession(id).then((info) => {
          if (info) {
            setRemainingSearches(info.remaining_searches);
            if (info.cooldown_remaining > 0) {
              setCooldown(info.cooldown_remaining);
            }
            // Refresh timestamp on successful server validation
            localStorage.setItem('research_session', JSON.stringify({ id, ts: Date.now() }));
          } else {
            localStorage.removeItem('research_session');
            setSessionId(null);
          }
        }).catch(() => {
          localStorage.removeItem('research_session');
          setSessionId(null);
        });
      } catch {
        localStorage.removeItem('research_session');
      }
    }
    // Migrate legacy key
    const legacy = localStorage.getItem('research_session_id');
    if (legacy) localStorage.removeItem('research_session_id');
  }, []);

  // Save session to localStorage with timestamp
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('research_session', JSON.stringify({ id: sessionId, ts: Date.now() }));
    }
  }, [sessionId]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const addThinkingStep = useCallback((id: string, label: string, detail: string) => {
    setThinkingSteps(prev => [...prev, { id, label, detail, timestamp: Date.now() }]);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setStatusMessage('');
    setProgress(null);
    setQueries([]);
    setSources([]);
    setResponse('');
    setError(null);
    setProvider(null);
    setReflectionVerdict(null);
    setThinkingSteps([]);
    setFollowUpQuestions([]);
  }, []);

  const search = useCallback(async (query: string) => {
    if (cooldown > 0) {
      setStatus('rate-limited');
      setError(`Please wait ${cooldown} seconds before searching again.`);
      return;
    }

    if (remainingSearches <= 0) {
      setStatus('quota-exceeded');
      setError('Search quota exceeded. You have reached the maximum of 5 searches per session.');
      return;
    }

    reset();
    setLastQuery(query);
    setStatus('generating-queries');
    setStatusMessage('Starting research...');
    addThinkingStep('init', 'Research Started', `Analyzing question: "${query}"`);

    try {
      for await (const event of searchQueryStream(query, sessionId || undefined)) {
        handleStreamEvent(event);
      }

      setCooldown(COOLDOWN_SECONDS);

    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('429')) {
        const match = err.message.match(/wait (\d+) seconds/);
        if (match) {
          setCooldown(parseInt(match[1]));
          setStatus('rate-limited');
          setError(`Please wait ${match[1]} seconds before searching again.`);
        } else if (err.message.includes('quota exceeded')) {
          setStatus('quota-exceeded');
          setRemainingSearches(0);
          setError('Search quota exceeded. Maximum 5 searches per session.');
        } else {
          setStatus('error');
          setError(err.message);
        }
      } else {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    }
  }, [sessionId, cooldown, remainingSearches, reset, addThinkingStep]);

  const retry = useCallback(async () => {
    if (lastQuery && status === 'error') {
      await search(lastQuery);
    }
  }, [lastQuery, status, search]);

  const handleStreamEvent = (event: StreamEvent) => {
    switch (event.event) {
      case 'session':
        if (event.data.session_id) {
          setSessionId(event.data.session_id);
        }
        if (event.data.remaining_searches !== undefined) {
          setRemainingSearches(event.data.remaining_searches);
        }
        break;

      case 'status':
        setStatusMessage(event.data.message || '');
        if (event.data.provider) {
          setProvider(event.data.provider);
        }
        if (event.data.step === 'queries') {
          setStatus('generating-queries');
          addThinkingStep('queries', 'Query Planning', 'Using Chain-of-Thought reasoning to generate diverse search queries...');
        } else if (event.data.step === 'search') {
          setStatus('searching');
          if (event.data.current && event.data.total) {
            setProgress({ current: event.data.current, total: event.data.total });
            addThinkingStep(
              `search-${event.data.current}`,
              `Searching (${event.data.current}/${event.data.total})`,
              event.data.message || 'Executing web search...'
            );
          }
        } else if (event.data.step === 'synthesis') {
          setStatus('synthesizing');
          setProgress(null);
          addThinkingStep('synthesis', 'Grounded Synthesis', 'Generating citation-backed response from verified sources...');
        } else if (event.data.step === 'reflection') {
          setStatus('reflecting');
          addThinkingStep('reflection', 'Self-Reflection', 'Evaluating response for completeness, accuracy, and citation quality...');
        } else if (event.data.step === 'improvement') {
          setStatus('improving');
          addThinkingStep('improvement', 'Improvement', 'Rewriting response to address identified issues...');
        }
        break;

      case 'queries':
        if (event.data.queries) {
          setQueries(event.data.queries);
          addThinkingStep(
            'queries-result',
            `Generated ${event.data.queries.length} Queries`,
            event.data.queries.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')
          );
        }
        break;

      case 'source':
        setSources(prev => [...prev, {
          title: event.data.title || '',
          url: event.data.url || '',
          resume: event.data.resume || ''
        }]);
        break;

      case 'content':
        if (event.data.replace) {
          setResponse('');
        } else if (event.data.token !== undefined) {
          setResponse(prev => prev + event.data.token);
        } else if (event.data.response !== undefined) {
          setResponse(event.data.response);
        }
        break;

      case 'follow_up':
        if (event.data.questions) {
          setFollowUpQuestions(event.data.questions as string[]);
        }
        break;

      case 'done':
        setStatus('complete');
        setStatusMessage('Research complete!');
        if (event.data.provider) {
          setProvider(event.data.provider);
        }
        if (event.data.reflection_verdict) {
          setReflectionVerdict(event.data.reflection_verdict);
          addThinkingStep(
            'verdict',
            `Reflection: ${event.data.reflection_verdict}`,
            event.data.reflection_verdict === 'PASS'
              ? 'Response passed quality evaluation on first attempt.'
              : 'Response was improved based on self-reflection feedback.'
          );
        }
        addThinkingStep('done', 'Research Complete', `Synthesized from ${event.data.sources_count || 0} sources using ${event.data.provider || 'AI'}.`);
        break;

      case 'error':
        setStatus('error');
        setError(event.data.message || 'An error occurred');
        break;
    }
  };

  return {
    search,
    retry,
    status,
    statusMessage,
    progress,
    queries,
    sources,
    response,
    error,
    sessionId,
    remainingSearches,
    cooldown,
    provider,
    lastQuery,
    reflectionVerdict,
    thinkingSteps,
    followUpQuestions,
    reset,
  };
}
