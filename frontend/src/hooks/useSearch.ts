'use client';

import { useState, useCallback, useEffect } from 'react';
import { searchQueryStream } from '@/lib/api';
import { Source, SearchStatus, StreamEvent } from '@/types';

const MAX_SEARCHES = 5;
const COOLDOWN_SECONDS = 10;

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

  // Load session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('research_session_id');
    if (stored) {
      setSessionId(stored);
    }
  }, []);

  // Save session to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('research_session_id', sessionId);
    }
  }, [sessionId]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const reset = useCallback(() => {
    setStatus('idle');
    setStatusMessage('');
    setProgress(null);
    setQueries([]);
    setSources([]);
    setResponse('');
    setError(null);
    setProvider(null);
  }, []);

  const search = useCallback(async (query: string) => {
    // Check if rate limited
    if (cooldown > 0) {
      setStatus('rate-limited');
      setError(`Please wait ${cooldown} seconds before searching again.`);
      return;
    }

    // Check if quota exceeded
    if (remainingSearches <= 0) {
      setStatus('quota-exceeded');
      setError('Search quota exceeded. You have reached the maximum of 5 searches per session.');
      return;
    }

    reset();
    setLastQuery(query);
    setStatus('generating-queries');
    setStatusMessage('Starting research...');

    try {
      for await (const event of searchQueryStream(query, sessionId || undefined)) {
        handleStreamEvent(event);
      }

      // Start cooldown after successful search
      setCooldown(COOLDOWN_SECONDS);

    } catch (err: unknown) {
      // Handle rate limit errors from API
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
  }, [sessionId, cooldown, remainingSearches, reset]);

  // Retry the last failed search
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
        } else if (event.data.step === 'search') {
          setStatus('searching');
          if (event.data.current && event.data.total) {
            setProgress({ current: event.data.current, total: event.data.total });
          }
        } else if (event.data.step === 'synthesis') {
          setStatus('synthesizing');
          setProgress(null);
        } else if (event.data.step === 'reflection') {
          setStatus('reflecting');
        } else if (event.data.step === 'improvement') {
          setStatus('improving');
        }
        break;

      case 'queries':
        if (event.data.queries) {
          setQueries(event.data.queries);
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

      case 'done':
        setStatus('complete');
        setStatusMessage('Research complete!');
        if (event.data.provider) {
          setProvider(event.data.provider);
        }
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
    reset,
  };
}
