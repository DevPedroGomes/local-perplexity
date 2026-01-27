'use client';

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function SearchBar({ onSearch, isLoading = false, disabled = false, placeholder = "Ask anything..." }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const isDisabled = isLoading || disabled;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isDisabled) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center">
        <div className={`absolute left-4 ${isDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
          <Search className="h-5 w-5" />
        </div>
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          className={`h-14 pl-12 pr-24 text-lg rounded-2xl border-2 border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all ${isDisabled ? 'opacity-60' : ''}`}
        />
        <Button
          type="submit"
          disabled={!query.trim() || isDisabled}
          className="absolute right-2 h-10 px-6 rounded-xl font-medium"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </div>
    </form>
  );
}
