'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles } from 'lucide-react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';

interface ResponseDisplayProps {
  response: string;
  isLoading?: boolean;
  isComplete?: boolean;
}

// Sanitize URL to prevent javascript: and data: URLs
function sanitizeUrl(url: string): string {
  const sanitized = DOMPurify.sanitize(url, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
    return sanitized;
  }
  return '#';
}

// Custom components for ReactMarkdown
const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a
      href={sanitizeUrl(href || '#')}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
      {...props}
    >
      {children}
    </a>
  ),
  p: ({ children }) => {
    // Handle citation badges [1], [2], etc. within paragraphs
    if (typeof children === 'string') {
      const parts = children.split(/(\[\d+\])/g);
      return (
        <p className="text-foreground/90 leading-relaxed">
          {parts.map((part, idx) =>
            /^\[\d+\]$/.test(part) ? (
              <Badge key={idx} variant="secondary" className="mx-0.5 text-xs font-normal">
                {part}
              </Badge>
            ) : (
              part
            )
          )}
        </p>
      );
    }
    return <p className="text-foreground/90 leading-relaxed">{children}</p>;
  },
};

export function ResponseDisplay({ response, isLoading = false, isComplete = false }: ResponseDisplayProps) {
  if (!response && !isLoading) return null;

  return (
    <Card className="overflow-hidden border-2 bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Response</h3>
            <p className="text-xs text-muted-foreground">Synthesized from multiple sources</p>
          </div>
          {isComplete && response && (
            <Badge variant="outline" className="ml-auto text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize]}
              components={markdownComponents}
            >
              {response}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
