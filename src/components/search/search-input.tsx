"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addToHistory,
  getRecentHistory,
  clearHistory,
  type SearchHistoryItem,
} from "./search-history";

interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
}

interface SearchInputProps {
  className?: string;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  autoFocus?: boolean;
}

export default function SearchInput({
  className,
  placeholder = "Search stocks... (e.g., VCB, FPT, HPG)",
  size = "md",
  autoFocus = false,
}: SearchInputProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(getRecentHistory(5));
  }, []);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/stock/search?q=${encodeURIComponent(q)}`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length >= 1) {
      setIsOpen(true);
      debounceRef.current = setTimeout(() => search(value), 300);
    } else {
      setResults([]);
      setIsOpen(true); // Show history when empty
    }
  };

  const handleSelect = (ticker: string, name: string) => {
    addToHistory(ticker, name);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    router.push(`/stock/${ticker}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = query.length >= 1 ? results : history;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          const item = items[selectedIndex];
          handleSelect(item.ticker, item.name);
        } else if (query.length > 0 && results.length > 0) {
          handleSelect(results[0].ticker, results[0].name);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    setHistory(getRecentHistory(5));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showHistory = isOpen && query.length < 1 && history.length > 0;
  const showResults = isOpen && query.length >= 1;

  const sizeClasses = {
    sm: "h-9 text-sm px-3",
    md: "h-11 text-base px-4",
    lg: "h-14 text-lg px-5",
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search
          size={iconSizes[size]}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-lg border border-border bg-background pl-10 pr-10",
            "text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "transition-all duration-200",
            sizeClasses[size]
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2
              size={iconSizes[size] - 2}
              className="animate-spin text-muted-foreground"
            />
          )}
          {query && !isLoading && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={iconSizes[size] - 2} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {(showHistory || showResults) && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-full rounded-lg border border-border bg-background shadow-lg",
            "max-h-80 overflow-y-auto"
          )}
        >
          {/* History */}
          {showHistory && (
            <div>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recent Searches
                </span>
                <button
                  onClick={() => {
                    clearHistory();
                    setHistory([]);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              {history.map((item, idx) => (
                <button
                  key={item.ticker}
                  onClick={() => handleSelect(item.ticker, item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent",
                    selectedIndex === idx && "bg-accent"
                  )}
                >
                  <Clock size={14} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{item.ticker}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.name}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {showResults && (
            <div>
              {results.length === 0 && !isLoading && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No results found for &ldquo;{query}&rdquo;
                </div>
              )}
              {results.map((item, idx) => (
                <button
                  key={item.ticker}
                  onClick={() => handleSelect(item.ticker, item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent",
                    selectedIndex === idx && "bg-accent"
                  )}
                >
                  <TrendingUp
                    size={14}
                    className="text-muted-foreground shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {item.ticker}
                      </span>
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                        {item.exchange}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.name}
                    </div>
                  </div>
                </button>
              ))}
              {isLoading && results.length === 0 && (
                <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Searching...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
