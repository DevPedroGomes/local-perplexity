'use client';

import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

interface QueriesListProps {
  queries: string[];
}

export function QueriesList({ queries }: QueriesListProps) {
  if (queries.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Search queries
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {queries.map((query, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-xs font-normal py-1 px-3"
          >
            {query}
          </Badge>
        ))}
      </div>
    </div>
  );
}
