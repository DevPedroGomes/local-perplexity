'use client';

import { useState, FormEvent } from 'react';
import { Search, Loader2, ArrowUp } from 'lucide-react';

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
      <div className="relative border-gradient rounded-2xl">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDisabled ? 'text-white/20' : 'text-white/40'}`}>
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          className={`w-full h-14 pl-12 pr-16 text-base rounded-2xl bg-white/[0.05] text-white placeholder:text-white/30 border-0 outline-none focus:bg-white/[0.08] focus:ring-1 focus:ring-blue-400/30 transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        <button
          type="submit"
          disabled={!query.trim() || isDisabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:bg-white/10 disabled:text-white/20 text-white flex items-center justify-center transition-all duration-200 hover:-translate-y-[calc(50%+1px)]"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>
    </form>
  );
}
