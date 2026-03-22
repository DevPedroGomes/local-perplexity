'use client';

import { Source } from '@/types';
import { ExternalLink } from 'lucide-react';

interface SourceCardProps {
  source: Source;
  index: number;
}

function getDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return url;
  }
}

function getFavicon(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

export function SourceCard({ source, index }: SourceCardProps) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] p-3 transition-all duration-200 min-w-[200px] max-w-[260px] shrink-0 border-gradient"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-400/15 text-[10px] font-bold text-blue-300 shrink-0">
          {index + 1}
        </span>
        <img
          src={getFavicon(source.url)}
          alt=""
          className="h-3.5 w-3.5 rounded-sm shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <span className="text-[11px] text-white/40 truncate">{getDomain(source.url)}</span>
        <ExternalLink className="h-3 w-3 text-white/20 group-hover:text-white/50 ml-auto shrink-0 transition-colors" />
      </div>
      <p className="text-xs text-white/70 font-medium leading-snug line-clamp-2 group-hover:text-white/90 transition-colors">
        {source.title}
      </p>
    </a>
  );
}
