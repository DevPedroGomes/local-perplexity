'use client';

import { SearchStatus as Status } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, FileText, CheckCircle2, AlertCircle, Sparkles, Clock, Ban, Eye, Wand2 } from 'lucide-react';

interface SearchStatusProps {
  status: Status;
  message: string;
  progress?: { current: number; total: number } | null;
}

const statusConfig = {
  idle: {
    icon: Search,
    color: 'bg-muted text-muted-foreground',
    label: 'Ready'
  },
  'generating-queries': {
    icon: Sparkles,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    label: 'Generating queries'
  },
  searching: {
    icon: Search,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    label: 'Searching'
  },
  synthesizing: {
    icon: FileText,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    label: 'Synthesizing'
  },
  reflecting: {
    icon: Eye,
    color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    label: 'Evaluating'
  },
  improving: {
    icon: Wand2,
    color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    label: 'Improving'
  },
  complete: {
    icon: CheckCircle2,
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    label: 'Complete'
  },
  error: {
    icon: AlertCircle,
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    label: 'Error'
  },
  'rate-limited': {
    icon: Clock,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    label: 'Rate Limited'
  },
  'quota-exceeded': {
    icon: Ban,
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    label: 'Quota Exceeded'
  }
};

export function SearchStatusIndicator({ status, message, progress }: SearchStatusProps) {
  if (status === 'idle') return null;

  const config = statusConfig[status];
  const Icon = config.icon;
  const isLoading = ['generating-queries', 'searching', 'synthesizing', 'reflecting', 'improving'].includes(status);

  return (
    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <Badge variant="outline" className={`${config.color} px-3 py-1.5 text-sm font-medium`}>
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5 mr-2" />
        )}
        {config.label}
        {progress && (
          <span className="ml-2 opacity-75">
            ({progress.current}/{progress.total})
          </span>
        )}
      </Badge>
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}
