'use client';

import { Source } from '@/types';
import { SourceCard } from './SourceCard';
import { Globe } from 'lucide-react';

interface SourcesListProps {
  sources: Source[];
  isLoading?: boolean;
}

export function SourcesList({ sources, isLoading = false }: SourcesListProps) {
  if (sources.length === 0 && !isLoading) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Globe className="h-3.5 w-3.5 text-white/40" />
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Sources {sources.length > 0 && `(${sources.length})`}
        </h3>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {sources.map((source, index) => (
          <SourceCard key={index} source={source} index={index} />
        ))}

        {isLoading && (
          <div className="flex gap-2.5 shrink-0">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="w-[220px] h-[72px] rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse shrink-0" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
