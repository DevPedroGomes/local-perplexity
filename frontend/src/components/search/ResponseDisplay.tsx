'use client';

import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';

interface ResponseDisplayProps {
  response: string;
  isLoading?: boolean;
  isComplete?: boolean;
}

function sanitizeUrl(url: string): string {
  const sanitized = DOMPurify.sanitize(url, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
    return sanitized;
  }
  return '#';
}

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a
      href={sanitizeUrl(href || '#')}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
      {...props}
    >
      {children}
    </a>
  ),
  p: ({ children }) => {
    if (typeof children === 'string') {
      const parts = children.split(/(\[\d+\])/g);
      return (
        <p>
          {parts.map((part, idx) =>
            /^\[\d+\]$/.test(part) ? (
              <span key={idx} className="inline-flex items-center justify-center h-4 min-w-[18px] px-1 rounded bg-blue-400/15 text-blue-300 text-[10px] font-semibold mx-0.5 align-text-top">
                {part}
              </span>
            ) : (
              part
            )
          )}
        </p>
      );
    }
    return <p>{children}</p>;
  },
};

export function ResponseDisplay({ response, isLoading = false, isComplete = false }: ResponseDisplayProps) {
  if (!response && !isLoading) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] border-gradient overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-white/[0.06]">
        <div className="h-7 w-7 rounded-lg bg-blue-400/15 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
        </div>
        <span className="text-sm font-medium text-white/80">Answer</span>
        {isComplete && response && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400/80 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Complete
          </span>
        )}
        {!isComplete && response && (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] text-blue-400/80 font-medium">Streaming...</span>
          </span>
        )}
      </div>

      {/* Content with internal scroll */}
      <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-3.5 rounded bg-white/[0.04] animate-pulse`} style={{ width: `${85 - i * 10}%` }} />
            ))}
          </div>
        ) : (
          <div className="prose-fluxora text-sm">
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize]}
              components={markdownComponents}
            >
              {response}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
