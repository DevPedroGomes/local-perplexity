'use client';

import { Search } from 'lucide-react';

interface QueriesListProps {
  queries: string[];
}

export function QueriesList({ queries }: QueriesListProps) {
  if (queries.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-white/40" />
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Queries</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {queries.map((query, index) => (
          <span
            key={index}
            className="inline-flex items-center rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-white/60 font-medium py-1 px-3"
          >
            {query}
          </span>
        ))}
      </div>
    </div>
  );
}
