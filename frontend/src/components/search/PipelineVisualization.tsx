'use client';

import { SearchStatus } from '@/types';
import { Sparkles, Search, FileText, Eye, Wand2, CheckCircle2, ChevronRight } from 'lucide-react';

interface PipelineVisualizationProps {
  status: SearchStatus;
  reflectionVerdict?: string | null;
}

const pipelineSteps = [
  {
    id: 'generating-queries',
    label: 'Query Planning',
    shortLabel: 'Plan',
    icon: Sparkles,
    description: 'Chain-of-Thought reasoning to generate diverse search queries',
  },
  {
    id: 'searching',
    label: 'Web Search',
    shortLabel: 'Search',
    icon: Search,
    description: 'Parallel search across multiple queries via Tavily API',
  },
  {
    id: 'synthesizing',
    label: 'Grounded Synthesis',
    shortLabel: 'Synthesize',
    icon: FileText,
    description: 'Citation-backed response generation from verified sources',
  },
  {
    id: 'reflecting',
    label: 'Self-Reflection',
    shortLabel: 'Reflect',
    icon: Eye,
    description: 'Quality evaluation for completeness, accuracy, and citations',
  },
  {
    id: 'improving',
    label: 'Improvement',
    shortLabel: 'Improve',
    icon: Wand2,
    description: 'Rewriting response to address identified issues',
  },
  {
    id: 'complete',
    label: 'Complete',
    shortLabel: 'Done',
    icon: CheckCircle2,
    description: 'Research finalized with references',
  },
];

type StepState = 'pending' | 'active' | 'completed' | 'skipped';

function getStepState(stepId: string, currentStatus: SearchStatus, reflectionVerdict?: string | null): StepState {
  const statusOrder = ['generating-queries', 'searching', 'synthesizing', 'reflecting', 'improving', 'complete'];
  const currentIdx = statusOrder.indexOf(currentStatus);
  const stepIdx = statusOrder.indexOf(stepId);

  if (currentIdx === -1) return 'pending';

  // Handle the "improving" step specially — it can be skipped if reflection passes
  if (stepId === 'improving') {
    if (currentStatus === 'complete' && reflectionVerdict === 'PASS') return 'skipped';
    if (currentIdx > stepIdx) return 'completed';
    if (currentStatus === 'improving') return 'active';
    return 'pending';
  }

  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

const stateStyles: Record<StepState, { node: string; icon: string; label: string; connector: string }> = {
  pending: {
    node: 'border-border/50 bg-muted/30',
    icon: 'text-muted-foreground/40',
    label: 'text-muted-foreground/40',
    connector: 'bg-border/30',
  },
  active: {
    node: 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-lg shadow-primary/5',
    icon: 'text-primary',
    label: 'text-foreground font-semibold',
    connector: 'bg-primary/50',
  },
  completed: {
    node: 'border-green-500/50 bg-green-500/10',
    icon: 'text-green-500',
    label: 'text-green-600',
    connector: 'bg-green-500/50',
  },
  skipped: {
    node: 'border-border/30 bg-muted/20 opacity-50',
    icon: 'text-muted-foreground/30',
    label: 'text-muted-foreground/40 line-through',
    connector: 'bg-border/20',
  },
};

export function PipelineVisualization({ status, reflectionVerdict }: PipelineVisualizationProps) {
  const isVisible = status !== 'idle' && status !== 'error' && status !== 'rate-limited' && status !== 'quota-exceeded';

  if (!isVisible) return null;

  return (
    <div className="w-full animate-fade-in-up">
      <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            LangGraph Pipeline
          </span>
        </div>

        {/* Desktop: horizontal layout */}
        <div className="hidden sm:flex items-center justify-between gap-1">
          {pipelineSteps.map((step, index) => {
            const state = getStepState(step.id, status, reflectionVerdict);
            const styles = stateStyles[state];
            const Icon = step.icon;
            const isActive = state === 'active';

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                {/* Node */}
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <div
                    className={`relative h-10 w-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${styles.node}`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl animate-ping bg-primary/10" />
                    )}
                    <Icon className={`h-4 w-4 transition-colors duration-300 ${styles.icon} ${isActive ? 'animate-pulse' : ''}`} />
                  </div>
                  <span className={`text-[10px] leading-tight text-center transition-colors duration-300 ${styles.label}`}>
                    {step.shortLabel}
                  </span>
                </div>

                {/* Connector */}
                {index < pipelineSteps.length - 1 && (
                  <div className="flex-1 flex items-center px-1 -mt-4">
                    <div className={`h-0.5 w-full rounded-full transition-colors duration-500 ${styles.connector}`} />
                    <ChevronRight className={`h-3 w-3 shrink-0 -ml-0.5 transition-colors duration-300 ${styles.icon}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: vertical compact layout */}
        <div className="flex sm:hidden flex-col gap-2">
          {pipelineSteps.map((step) => {
            const state = getStepState(step.id, status, reflectionVerdict);
            const styles = stateStyles[state];
            const Icon = step.icon;
            const isActive = state === 'active';

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-all duration-300 ${styles.node}`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors duration-300 ${styles.icon} ${isActive ? 'animate-pulse' : ''}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs transition-colors duration-300 ${styles.label}`}>
                    {step.label}
                  </span>
                </div>
                {state === 'completed' && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                )}
                {isActive && (
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Current step description */}
        {status !== 'complete' && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground italic">
              {pipelineSteps.find(s => s.id === status)?.description || 'Processing...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
