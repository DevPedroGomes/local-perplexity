'use client';

import { useState } from 'react';
import { ThinkingStep } from '@/hooks/useSearch';
import { ChevronDown, ChevronUp, Brain, Clock } from 'lucide-react';

interface ThinkingPanelProps {
  steps: ThinkingStep[];
  isActive: boolean;
}

function formatTimeDiff(current: number, first: number): string {
  const diff = Math.round((current - first) / 1000);
  if (diff < 1) return '0s';
  return `${diff}s`;
}

export function ThinkingPanel({ steps, isActive }: ThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (steps.length === 0) return null;

  const firstTimestamp = steps[0].timestamp;
  const latestStep = steps[steps.length - 1];

  return (
    <div className="w-full animate-fade-in-up">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors text-left group"
      >
        <Brain className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        <span className="text-xs font-medium text-muted-foreground flex-1 min-w-0">
          {isActive ? (
            <span className="text-foreground">{latestStep.label}</span>
          ) : (
            <span>AI Reasoning — {steps.length} steps in {formatTimeDiff(latestStep.timestamp, firstTimestamp)}</span>
          )}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatTimeDiff(Date.now(), firstTimestamp)}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-1 rounded-xl border bg-card/30 backdrop-blur-sm overflow-hidden">
          <div className="max-h-64 overflow-y-auto p-3 space-y-0">
            {steps.map((step, index) => (
              <div key={step.id} className="flex gap-3 group/step">
                {/* Timeline */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`h-2 w-2 rounded-full mt-1.5 ${
                    index === steps.length - 1 && isActive
                      ? 'bg-primary animate-pulse'
                      : 'bg-muted-foreground/30'
                  }`} />
                  {index < steps.length - 1 && (
                    <div className="w-px flex-1 bg-border/50 my-0.5" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-3 min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {step.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      +{formatTimeDiff(step.timestamp, firstTimestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 whitespace-pre-line">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
