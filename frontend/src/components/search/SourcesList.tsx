'use client';

import { Source } from '@/types';
import { SourceCard } from './SourceCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';

interface SourcesListProps {
  sources: Source[];
  isLoading?: boolean;
}

export function SourcesList({ sources, isLoading = false }: SourcesListProps) {
  if (sources.length === 0 && !isLoading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Sources {sources.length > 0 && `(${sources.length})`}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sources.map((source, index) => (
          <SourceCard key={index} source={source} index={index} />
        ))}

        {isLoading && (
          <div className="rounded-lg border bg-card/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
      </div>
    </div>
  );
}
