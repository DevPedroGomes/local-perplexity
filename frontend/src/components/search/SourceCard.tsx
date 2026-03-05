'use client';

import { Source } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Globe } from 'lucide-react';

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

export function SourceCard({ source, index }: SourceCardProps) {
  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Badge
            variant="outline"
            className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-semibold bg-primary/5"
          >
            {index + 1}
          </Badge>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {getDomain(source.url)}
              </span>
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group/link"
            >
              <h4 className="font-medium text-sm leading-snug line-clamp-2 group-hover/link:text-primary transition-colors">
                {source.title}
                <ExternalLink className="inline-block h-3 w-3 ml-1 opacity-0 group-hover/link:opacity-100 transition-opacity" />
              </h4>
            </a>
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {source.resume}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
