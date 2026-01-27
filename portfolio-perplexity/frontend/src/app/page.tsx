'use client';

import { useSearch } from '@/hooks/useSearch';
import { SearchBar, SearchStatusIndicator, SourcesList, ResponseDisplay, QueriesList } from '@/components/search';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Github, ExternalLink, Clock, Zap } from 'lucide-react';

export default function Home() {
  const {
    search,
    status,
    statusMessage,
    progress,
    queries,
    sources,
    response,
    error,
    remainingSearches,
    cooldown,
  } = useSearch();

  const isLoading = ['generating-queries', 'searching', 'synthesizing'].includes(status);
  const isDisabled = isLoading || cooldown > 0 || remainingSearches <= 0;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background gradient */}
      <div className="fixed inset-0 gradient-bg pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">Research Agent</span>
            <Badge variant="secondary" className="text-xs">AI Powered</Badge>
          </div>
          <div className="flex items-center gap-3">
            {/* Rate limit indicators */}
            <div className="flex items-center gap-2 text-sm">
              {cooldown > 0 && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Clock className="h-3 w-3 mr-1" />
                  {cooldown}s
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-xs ${
                  remainingSearches <= 0
                    ? 'bg-red-500/10 text-red-600 border-red-500/20'
                    : remainingSearches <= 2
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-green-500/10 text-green-600 border-green-500/20'
                }`}
              >
                <Zap className="h-3 w-3 mr-1" />
                {remainingSearches}/5 searches
              </Badge>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-4xl px-4 py-8">
        {/* Hero section - shown when idle */}
        {status === 'idle' && !response && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-fade-in-up">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Research Agent
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              AI-powered research assistant that searches the web and synthesizes information from multiple sources.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="font-normal">LangGraph</Badge>
              <Badge variant="outline" className="font-normal">Ollama</Badge>
              <Badge variant="outline" className="font-normal">Tavily</Badge>
            </div>

            {/* Usage limits info */}
            <div className="mt-4 p-4 rounded-lg bg-muted/50 border text-sm text-muted-foreground max-w-md">
              <p className="font-medium text-foreground mb-2">Demo Limits</p>
              <ul className="space-y-1 text-xs">
                <li>• Maximum 5 searches per session</li>
                <li>• 10 second cooldown between searches</li>
                <li>• Session expires after 30 minutes of inactivity</li>
              </ul>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className={`${status === 'idle' && !response ? 'max-w-2xl mx-auto' : 'mb-8'}`}>
          <SearchBar
            onSearch={search}
            isLoading={isLoading}
            disabled={isDisabled}
            placeholder={
              remainingSearches <= 0
                ? "Search quota exceeded"
                : cooldown > 0
                ? `Wait ${cooldown}s...`
                : "Ask anything... (e.g., What are the latest developments in AI?)"
            }
          />

          {/* Cooldown/quota message below search */}
          {(cooldown > 0 || remainingSearches <= 0) && !isLoading && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              {remainingSearches <= 0
                ? "You've used all 5 searches. Refresh the page to start a new session."
                : `Please wait ${cooldown} seconds before your next search.`}
            </p>
          )}
        </div>

        {/* Status indicator */}
        {status !== 'idle' && (
          <div className="mb-6">
            <SearchStatusIndicator
              status={status}
              message={statusMessage}
              progress={progress}
            />
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <p className="font-medium">
              {status === 'rate-limited' ? 'Rate Limited' : status === 'quota-exceeded' ? 'Quota Exceeded' : 'Error'}
            </p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results section */}
        {(queries.length > 0 || sources.length > 0 || response) && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Queries */}
            <QueriesList queries={queries} />

            {/* Sources */}
            <SourcesList
              sources={sources}
              isLoading={status === 'searching'}
            />

            {/* Response */}
            <ResponseDisplay
              response={response}
              isLoading={status === 'synthesizing'}
            />
          </div>
        )}

        {/* Footer hint */}
        {status === 'idle' && !response && (
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Built with{' '}
              <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
                Next.js
              </a>
              {', '}
              <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
                shadcn/ui
              </a>
              {', and '}
              <a href="https://www.langchain.com/langgraph" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
                LangGraph
              </a>
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="container max-w-4xl px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>Perplexity Clone - Research Agent</p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                Portfolio <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
