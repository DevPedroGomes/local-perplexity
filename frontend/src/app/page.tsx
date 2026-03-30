'use client';

import { useRef, useEffect } from 'react';
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
import { Sparkles, Github, Clock, Zap, RotateCcw, Brain, Search, FileText, Eye, Wand2, Shield, ArrowRight } from 'lucide-react';

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
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results when search starts
  useEffect(() => {
    if (isLoading && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [isLoading]);

  return (
    <div className="min-h-screen relative flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Background effects */}
      <div className="fixed inset-0 gradient-bg pointer-events-none" />
      <div className="fixed inset-0 grid-bg pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-sm font-semibold text-white">My Searcher</span>
            {provider && (
              <span className="hidden sm:inline-flex text-[10px] text-blue-300/70 bg-blue-400/10 px-2 py-0.5 rounded-full font-medium">
                {provider}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {cooldown > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400/70 bg-amber-400/10 px-2 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                {cooldown}s
              </span>
            )}
            <span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium ${
              remainingSearches <= 0
                ? 'text-red-400/70 bg-red-400/10'
                : remainingSearches <= 2
                ? 'text-amber-400/70 bg-amber-400/10'
                : 'text-emerald-400/70 bg-emerald-400/10'
            }`}>
              <Zap className="h-3 w-3" />
              {remainingSearches}/5
            </span>
            <a
              href="https://github.com/DevPedroGomes/local-searcher"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-white/60 transition-colors"
              aria-label="View source on GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 py-8">

        {/* ======================== */}
        {/* HERO — idle state only   */}
        {/* ======================== */}
        {status === 'idle' && !response && (
          <div className="flex flex-col items-center justify-center text-center space-y-8 animate-fade-slide-in pt-8 sm:pt-16">
            <div className="space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center mx-auto border-gradient">
                <Sparkles className="h-7 w-7 text-blue-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                My Searcher
              </h1>
              <p className="text-sm italic text-white/30">like Perplexity... but mine</p>
              <p className="text-base text-white/50 max-w-lg mx-auto leading-relaxed">
                AI-powered research that searches the web and synthesizes citation-backed answers from multiple sources.
              </p>
              <div className="flex items-center justify-center gap-2">
                {['LangGraph', 'Groq', 'Tavily'].map((tech) => (
                  <span key={tech} className="text-[11px] text-white/40 bg-white/[0.04] border border-white/[0.08] rounded-full px-2.5 py-1 font-medium">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* How it works — compact */}
            <div className="w-full max-w-2xl space-y-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">5-Stage AI Pipeline</h2>
              <div className="grid gap-2">
                {[
                  { icon: Brain, label: 'Query Planning', desc: 'Decomposes your question into diverse search queries', color: 'blue' },
                  { icon: Search, label: 'Web Search', desc: 'Parallel search across queries via Tavily API', color: 'amber' },
                  { icon: FileText, label: 'Grounded Synthesis', desc: 'Citation-backed response with inline references', color: 'purple' },
                  { icon: Eye, label: 'Self-Reflection', desc: 'Quality evaluation for completeness and accuracy', color: 'cyan' },
                  { icon: Wand2, label: 'Improvement', desc: 'Conditional rewriting if issues are found', color: 'indigo' },
                ].map((step, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] border-gradient text-left">
                    <div className={`h-8 w-8 rounded-lg bg-${step.color}-400/10 flex items-center justify-center shrink-0`}>
                      <step.icon className={`h-4 w-4 text-${step.color}-400`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white/80">{i + 1}. {step.label}</h3>
                      <p className="text-xs text-white/35 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: '3-5', label: 'LLM calls' },
                  { value: '~15', label: 'sources' },
                  { value: '100%', label: 'grounded' },
                ].map((stat) => (
                  <div key={stat.label} className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center border-gradient">
                    <div className="text-lg font-semibold text-white tracking-tight">{stat.value}</div>
                    <div className="text-[11px] text-white/35">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Security badges */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { icon: Shield, label: 'XSS Protection' },
                  { icon: Zap, label: 'Rate Limiting' },
                  { icon: ArrowRight, label: 'LLM Failover' },
                ].map((badge) => (
                  <span key={badge.label} className="inline-flex items-center gap-1.5 text-[10px] text-white/30 bg-white/[0.03] border border-white/[0.06] rounded-full px-2.5 py-1">
                    <badge.icon className="h-3 w-3" />
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Demo limits */}
            <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/35 max-w-sm w-full text-left border-gradient">
              <p className="font-medium text-white/50 mb-1.5">Demo Limits</p>
              <ul className="space-y-0.5">
                <li>5 searches per session / 10s cooldown</li>
                <li>Session expires after 30 min / IP rate limiting</li>
              </ul>
            </div>
          </div>
        )}

        {/* ======================== */}
        {/* SEARCH BAR               */}
        {/* ======================== */}
        <div className={`transition-all duration-500 ${status === 'idle' && !response ? 'max-w-2xl mx-auto mt-6' : 'max-w-3xl mx-auto mb-5'}`}>
          <SearchBar
            onSearch={search}
            isLoading={isLoading}
            disabled={isDisabled}
            placeholder={
              remainingSearches <= 0
                ? "Search quota exceeded"
                : cooldown > 0
                ? `Wait ${cooldown}s...`
                : "Ask anything..."
            }
          />

          {(cooldown > 0 || remainingSearches <= 0) && !isLoading && (
            <p className="text-center text-xs text-white/30 mt-2">
              {remainingSearches <= 0
                ? "All 5 searches used. Refresh for a new session."
                : `Wait ${cooldown}s before next search.`}
            </p>
          )}
        </div>

        {/* ======================== */}
        {/* RESULTS AREA              */}
        {/* ======================== */}
        {(hasResults || isLoading) && (
          <div ref={resultsRef} className="space-y-4 max-w-3xl mx-auto">

            {/* Pipeline — compact inline bar */}
            <PipelineVisualization status={status} reflectionVerdict={reflectionVerdict} />

            {/* Thinking — collapsible */}
            {thinkingSteps.length > 0 && (
              <ThinkingPanel steps={thinkingSteps} isActive={isLoading} />
            )}

            {/* Status */}
            {status !== 'idle' && status !== 'complete' && (
              <SearchStatusIndicator status={status} message={statusMessage} progress={progress} />
            )}

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15 animate-fade-in-up">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-red-400">
                      {status === 'rate-limited' ? 'Rate Limited' : status === 'quota-exceeded' ? 'Quota Exceeded' : 'Error'}
                    </p>
                    <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
                  </div>
                  {status === 'error' && lastQuery && remainingSearches > 0 && cooldown === 0 && (
                    <button
                      onClick={retry}
                      className="shrink-0 flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Sources — horizontal scrollable */}
            <SourcesList sources={sources} isLoading={status === 'searching'} />

            {/* Queries — compact chips */}
            <QueriesList queries={queries} />

            {/* Response — main glass card */}
            <ResponseDisplay
              response={response}
              isLoading={['synthesizing', 'improving'].includes(status) && response.length === 0}
              isComplete={status === 'complete'}
            />

            {/* Empty results */}
            {status === 'complete' && sources.length === 0 && !response && (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in-up">
                <Search className="h-10 w-10 text-white/20 mb-4" />
                <p className="text-center text-white/40 text-sm">
                  Nenhum resultado encontrado. Tente reformular sua pergunta.
                </p>
              </div>
            )}

            {/* Follow-up questions */}
            {status === 'complete' && (
              <FollowUpQuestions
                questions={followUpQuestions}
                onSelect={search}
                disabled={isDisabled}
              />
            )}
          </div>
        )}

        {/* Footer hint — idle only */}
        {status === 'idle' && !response && (
          <div className="mt-8 text-center">
            <p className="text-xs text-white/20">
              Built with Next.js, shadcn/ui, and LangGraph
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-4">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center justify-between text-[11px] text-white/25">
            <span>My Searcher - AI Research</span>
            <a
              href="https://github.com/DevPedroGomes"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/50 transition-colors"
            >
              Portfolio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
