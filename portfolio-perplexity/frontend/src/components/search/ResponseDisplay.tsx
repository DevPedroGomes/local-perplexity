'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles } from 'lucide-react';
import DOMPurify from 'dompurify';

interface ResponseDisplayProps {
  response: string;
  isLoading?: boolean;
}

// Sanitize text to prevent XSS attacks
function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// Sanitize URL to prevent javascript: and data: URLs
function sanitizeUrl(url: string): string {
  const sanitized = DOMPurify.sanitize(url, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  // Only allow http and https URLs
  if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
    return sanitized;
  }
  return '#';
}

// Simple markdown-like rendering
function renderContent(content: string) {
  // Split by double newlines for paragraphs
  const paragraphs = content.split(/\n\n+/);

  return paragraphs.map((paragraph, idx) => {
    // Check if it's a header
    if (paragraph.startsWith('**References:**') || paragraph.startsWith('## References')) {
      return (
        <div key={idx} className="mt-6 pt-4 border-t">
          <h4 className="font-semibold text-sm text-muted-foreground mb-2">References</h4>
          <div className="text-sm space-y-1 text-muted-foreground">
            {paragraph.replace(/^\*\*References:\*\*\n?|^## References\n?/, '').split('\n').map((ref, i) => (
              <p key={i} className="break-words">
                {renderInlineMarkdown(ref)}
              </p>
            ))}
          </div>
        </div>
      );
    }

    // Regular paragraph
    return (
      <p key={idx} className="text-foreground/90 leading-relaxed">
        {renderInlineMarkdown(paragraph)}
      </p>
    );
  });
}

function renderInlineMarkdown(text: string) {
  // Handle bold
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\[\d+\])/g);

  return parts.map((part, idx) => {
    // Bold text
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{sanitizeText(part.slice(2, -2))}</strong>;
    }

    // Links - sanitize both text and URL to prevent XSS
    const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const linkText = sanitizeText(linkMatch[1]);
      const linkUrl = sanitizeUrl(linkMatch[2]);
      return (
        <a
          key={idx}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {linkText}
        </a>
      );
    }

    // Citations [1], [2], etc.
    if (/^\[\d+\]$/.test(part)) {
      return (
        <Badge key={idx} variant="secondary" className="mx-0.5 text-xs font-normal">
          {part}
        </Badge>
      );
    }

    return sanitizeText(part);
  });
}

export function ResponseDisplay({ response, isLoading = false }: ResponseDisplayProps) {
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
          {!isLoading && response && (
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
            {renderContent(response)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
