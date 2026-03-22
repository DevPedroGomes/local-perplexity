'use client';

import { SearchStatus } from '@/types';
import { Sparkles, Search, FileText, Eye, Wand2, CheckCircle2 } from 'lucide-react';

interface PipelineVisualizationProps {
  status: SearchStatus;
  reflectionVerdict?: string | null;
}

const pipelineSteps = [
  { id: 'generating-queries', label: 'Plan', icon: Sparkles },
  { id: 'searching', label: 'Search', icon: Search },
  { id: 'synthesizing', label: 'Synthesize', icon: FileText },
  { id: 'reflecting', label: 'Reflect', icon: Eye },
  { id: 'improving', label: 'Improve', icon: Wand2 },
  { id: 'complete', label: 'Done', icon: CheckCircle2 },
];

type StepState = 'pending' | 'active' | 'completed' | 'skipped';

function getStepState(stepId: string, currentStatus: SearchStatus, reflectionVerdict?: string | null): StepState {
  const statusOrder = ['generating-queries', 'searching', 'synthesizing', 'reflecting', 'improving', 'complete'];
  const currentIdx = statusOrder.indexOf(currentStatus);
  const stepIdx = statusOrder.indexOf(stepId);

  if (currentIdx === -1) return 'pending';

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

export function PipelineVisualization({ status, reflectionVerdict }: PipelineVisualizationProps) {
  const isVisible = status !== 'idle' && status !== 'error' && status !== 'rate-limited' && status !== 'quota-exceeded';

  if (!isVisible) return null;

  return (
    <div className="w-full animate-fade-in-up">
      <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 border-gradient">
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium mr-2 hidden sm:block">Pipeline</span>

        {pipelineSteps.map((step, index) => {
          const state = getStepState(step.id, status, reflectionVerdict);
          const Icon = step.icon;
          const isActive = state === 'active';

          const dotColor =
            state === 'completed' ? 'bg-emerald-400' :
            state === 'active' ? 'bg-blue-400' :
            state === 'skipped' ? 'bg-white/10' :
            'bg-white/15';

          const textColor =
            state === 'completed' ? 'text-emerald-400/80' :
            state === 'active' ? 'text-blue-400' :
            state === 'skipped' ? 'text-white/20 line-through' :
            'text-white/25';

          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${state === 'active' ? 'bg-blue-400/10' : ''} transition-all duration-300`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${isActive ? 'animate-pulse' : ''} transition-colors`} />
                <span className={`text-[11px] font-medium ${textColor} transition-colors whitespace-nowrap`}>
                  {step.label}
                </span>
              </div>

              {index < pipelineSteps.length - 1 && (
                <div className={`w-3 h-px ${state === 'completed' ? 'bg-emerald-400/30' : 'bg-white/10'} transition-colors mx-0.5`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
