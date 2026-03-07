'use client';

import { useSearch } from '@/hooks/useSearch';
import {
  SearchBar,
  SearchStatusIndicator,
  SourcesList,
  ResponseDisplay,
  QueriesList,
  PipelineVisualization,
  ThinkingPanel,
  FollowUpQuestions,
} from '@/components/search';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Github, ExternalLink, Clock, Zap, RotateCcw, Brain, Search, FileText, Eye, Wand2, Shield, ArrowRight } from 'lucide-react';

export default function Home() {
  const {
    search,
    retry,
    status,
    statusMessage,
    progress,
    queries,
    sources,
    response,
    error,
    remainingSearches,
    cooldown,
    provider,
    lastQuery,
    reflectionVerdict,
    thinkingSteps,
    followUpQuestions,
  } = useSearch();

  const isLoading = ['generating-queries', 'searching', 'synthesizing', 'reflecting', 'improving'].includes(status);
  const isDisabled = isLoading || cooldown > 0 || remainingSearches <= 0;
  const hasResults = queries.length > 0 || sources.length > 0 || response;

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      {/* Background gradient */}
      <div className="fixed inset-0 gradient-bg pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">My Searcher</span>
            <Badge variant="secondary" className="hidden sm:inline-flex text-xs">AI Powered</Badge>
            {provider && (
              <Badge variant="outline" className="hidden sm:inline-flex text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                {provider}
              </Badge>
            )}
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
                {remainingSearches}/5
              </Badge>
            </div>
            <a
              href="https://github.com/DevPedroGomes/local-searcher"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="View source on GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 py-8">
        {/* Hero section - shown when idle */}
        {status === 'idle' && !response && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 animate-fade-in-up">
            {/* Hero */}
            <div className="space-y-4 pt-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                My Searcher
              </h1>
              <p className="text-sm italic text-muted-foreground/70">
                like Perplexity... but mine
              </p>
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                AI-powered research assistant that searches the web and synthesizes information from multiple sources into comprehensive, citation-backed answers.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="font-normal">LangGraph</Badge>
                <Badge variant="outline" className="font-normal">Groq</Badge>
                <Badge variant="outline" className="font-normal">Tavily</Badge>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="w-full max-w-2xl space-y-4 pt-2">
              <h2 className="text-lg font-semibold text-foreground">How the AI Works</h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Every search triggers a 5-stage AI pipeline orchestrated by LangGraph, using advanced RAG (Retrieval-Augmented Generation) techniques:
              </p>

              {/* Pipeline Steps Explained */}
              <div className="grid gap-3 text-left">
                <div className="flex gap-3 p-3 rounded-xl border bg-card/50 backdrop-blur-sm">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Brain className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">1. Chain-of-Thought Query Planning</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The LLM reasons step-by-step to decompose your question into 3-5 diverse search queries, covering different angles — factual, recent developments, and expert opinions.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 rounded-xl border bg-card/50 backdrop-blur-sm">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">2. Parallel Web Search</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Each query searches the web via Tavily API, retrieving up to 5 results per query. Results are deduplicated by URL for broad, non-redundant coverage.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 rounded-xl border bg-card/50 backdrop-blur-sm">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">3. Grounded Synthesis</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The response is generated with strict grounding rules — every claim must be backed by a source with inline citations [1], [2]. No hallucination allowed. Tokens stream in real-time.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 rounded-xl border bg-card/50 backdrop-blur-sm">
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Eye className="h-4 w-4 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">4. Self-Reflection</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The AI evaluates its own response for completeness, accuracy, citation quality, and clarity. It returns a PASS/NEEDS_IMPROVEMENT verdict using structured output.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 rounded-xl border bg-card/50 backdrop-blur-sm">
                  <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Wand2 className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">5. Conditional Improvement</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      If the reflection identifies issues, the response is rewritten once to fix them. If it passes, the response is finalized as-is. You can watch this happen live in the pipeline visualization above.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tech Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl border bg-card/50 text-center">
                  <div className="text-2xl font-bold text-foreground">3-5</div>
                  <div className="text-xs text-muted-foreground">LLM calls per search</div>
                </div>
                <div className="p-3 rounded-xl border bg-card/50 text-center">
                  <div className="text-2xl font-bold text-foreground">~15</div>
                  <div className="text-xs text-muted-foreground">sources analyzed</div>
                </div>
                <div className="p-3 rounded-xl border bg-card/50 text-center">
                  <div className="text-2xl font-bold text-foreground">100%</div>
                  <div className="text-xs text-muted-foreground">grounded in sources</div>
                </div>
              </div>

              {/* Security & Architecture badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Badge variant="outline" className="text-xs font-normal gap-1">
                  <Shield className="h-3 w-3" />
                  DOMPurify XSS Protection
                </Badge>
                <Badge variant="outline" className="text-xs font-normal gap-1">
                  <Zap className="h-3 w-3" />
                  Dual Rate Limiting
                </Badge>
                <Badge variant="outline" className="text-xs font-normal gap-1">
                  <ArrowRight className="h-3 w-3" />
                  Auto LLM Failover
                </Badge>
              </div>
            </div>

            {/* Demo Limits */}
            <div className="p-4 rounded-lg bg-muted/50 border text-sm text-muted-foreground max-w-sm w-full">
              <p className="font-medium text-foreground mb-2">Demo Limits</p>
              <ul className="space-y-1 text-xs text-left">
                <li>• Maximum 5 searches per session</li>
                <li>• 10 second cooldown between searches</li>
                <li>• Session expires after 30 minutes of inactivity</li>
                <li>• IP-based rate limiting (15/hour) prevents abuse</li>
              </ul>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className={`${status === 'idle' && !response ? 'max-w-2xl mx-auto' : 'max-w-3xl mx-auto mb-6'}`}>
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

        {/* Pipeline Visualization — shows during active search */}
        {(isLoading || status === 'complete') && (
          <div className="mb-6 max-w-3xl mx-auto">
            <PipelineVisualization status={status} reflectionVerdict={reflectionVerdict} />
          </div>
        )}

        {/* Thinking Panel — collapsible reasoning trace */}
        {thinkingSteps.length > 0 && (
          <div className="mb-6 max-w-3xl mx-auto">
            <ThinkingPanel steps={thinkingSteps} isActive={isLoading} />
          </div>
        )}

        {/* Status indicator */}
        {status !== 'idle' && (
          <div className="mb-6 max-w-3xl mx-auto">
            <SearchStatusIndicator
              status={status}
              message={statusMessage}
              progress={progress}
            />
          </div>
        )}

        {/* Error display with retry button */}
        {error && (
          <div className="mb-6 max-w-3xl mx-auto p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  {status === 'rate-limited' ? 'Rate Limited' : status === 'quota-exceeded' ? 'Quota Exceeded' : 'Error'}
                </p>
                <p className="text-sm">{error}</p>
              </div>
              {status === 'error' && lastQuery && remainingSearches > 0 && cooldown === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retry}
                  className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Results section */}
        {hasResults && (
          <div className="space-y-6 animate-fade-in-up max-w-3xl mx-auto">
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
              isLoading={['synthesizing', 'improving'].includes(status) && response.length === 0}
              isComplete={status === 'complete'}
            />

            {/* Follow-up Questions */}
            {status === 'complete' && (
              <FollowUpQuestions
                questions={followUpQuestions}
                onSelect={search}
                disabled={isDisabled}
              />
            )}
          </div>
        )}

        {/* Footer hint */}
        {status === 'idle' && !response && (
          <div className="mt-8 text-center">
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
      <footer className="border-t py-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>My Searcher - AI-Powered Research</p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/DevPedroGomes"
                target="_blank"
                rel="noopener noreferrer"
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
