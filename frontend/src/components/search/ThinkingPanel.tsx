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
        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-left group border-gradient"
      >
        <Brain className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-blue-400 animate-pulse' : 'text-white/40'}`} />
        <span className="text-xs text-white/50 flex-1 min-w-0">
          {isActive ? (
            <span className="text-white/70">{latestStep.label}</span>
          ) : (
            <span>{steps.length} steps in {formatTimeDiff(latestStep.timestamp, firstTimestamp)}</span>
          )}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] text-white/30">
              <Clock className="h-3 w-3" />
              {formatTimeDiff(Date.now(), firstTimestamp)}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-white/30 group-hover:text-white/50 transition-colors" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-white/30 group-hover:text-white/50 transition-colors" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-1 rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          <div className="max-h-48 overflow-y-auto p-3 space-y-0">
            {steps.map((step, index) => (
              <div key={step.id} className="flex gap-3 group/step">
                <div className="flex flex-col items-center shrink-0">
                  <div className={`h-1.5 w-1.5 rounded-full mt-1.5 ${
                    index === steps.length - 1 && isActive
                      ? 'bg-blue-400 animate-pulse'
                      : 'bg-white/20'
                  }`} />
                  {index < steps.length - 1 && (
                    <div className="w-px flex-1 bg-white/[0.06] my-0.5" />
                  )}
                </div>
                <div className="pb-2.5 min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-medium text-white/70">{step.label}</span>
                    <span className="text-[10px] text-white/20">+{formatTimeDiff(step.timestamp, firstTimestamp)}</span>
                  </div>
                  <p className="text-[11px] text-white/35 leading-relaxed mt-0.5 whitespace-pre-line">
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
