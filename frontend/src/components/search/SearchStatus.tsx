'use client';

import { SearchStatus as Status } from '@/types';
import { Loader2, Search, FileText, CheckCircle2, AlertCircle, Sparkles, Clock, Ban, Eye, Wand2 } from 'lucide-react';

interface SearchStatusProps {
  status: Status;
  message: string;
  progress?: { current: number; total: number } | null;
}

const statusConfig: Record<Status, { icon: typeof Search; color: string; label: string }> = {
  idle: { icon: Search, color: 'text-white/40', label: 'Ready' },
  'generating-queries': { icon: Sparkles, color: 'text-blue-400', label: 'Planning queries' },
  searching: { icon: Search, color: 'text-amber-400', label: 'Searching web' },
  synthesizing: { icon: FileText, color: 'text-purple-400', label: 'Synthesizing' },
  reflecting: { icon: Eye, color: 'text-cyan-400', label: 'Evaluating' },
  improving: { icon: Wand2, color: 'text-indigo-400', label: 'Improving' },
  complete: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Complete' },
  error: { icon: AlertCircle, color: 'text-red-400', label: 'Error' },
  'rate-limited': { icon: Clock, color: 'text-amber-400', label: 'Rate limited' },
  'quota-exceeded': { icon: Ban, color: 'text-red-400', label: 'Quota exceeded' },
};

export function SearchStatusIndicator({ status, message, progress }: SearchStatusProps) {
  if (status === 'idle') return null;

  const config = statusConfig[status];
  const Icon = config.icon;
  const isLoading = ['generating-queries', 'searching', 'synthesizing', 'reflecting', 'improving'].includes(status);

  return (
    <div className="flex items-center gap-2.5 animate-fade-in-up">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] ${config.color}`}>
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Icon className="h-3 w-3" />
        )}
        <span className="text-xs font-medium">
          {config.label}
          {progress && ` (${progress.current}/${progress.total})`}
        </span>
      </div>
      <span className="text-xs text-white/35">{message}</span>
    </div>
  );
}
