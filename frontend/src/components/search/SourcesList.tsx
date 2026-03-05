'use client';

import { Source } from '@/types';
import { SourceCard } from './SourceCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-4">
          {sources.map((source, index) => (
            <div key={index} className="w-[280px] shrink-0">
              <SourceCard source={source} index={index} />
            </div>
          ))}

          {isLoading && (
            <div className="w-[280px] shrink-0">
              <div className="rounded-lg border bg-card/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
