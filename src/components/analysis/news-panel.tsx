"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface NewsItem {
  title: string;
  source: string;
  url: string;
  timestamp: number;
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
}

interface NewsPanelProps {
  news: NewsItem[];
  isLoading?: boolean;
}

type FilterMode = "all" | "positive" | "negative";

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

function SentimentBadge({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  if (sentiment === "positive") {
    return <Badge variant="success" className="text-[10px]">Positive</Badge>;
  }
  if (sentiment === "negative") {
    return <Badge variant="destructive" className="text-[10px]">Negative</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">Neutral</Badge>;
}

function NewsItemCard({ item }: { item: NewsItem }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border/50 p-4 space-y-2 transition-colors hover:border-border">
      <div className="flex items-start justify-between gap-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold leading-snug hover:text-primary transition-colors line-clamp-2 flex-1"
        >
          {item.title}
          <svg className="inline-block h-3 w-3 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <SentimentBadge sentiment={item.sentiment} />
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">
          {item.source}
        </Badge>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {relativeTime(item.timestamp)}
        </span>
      </div>

      {item.summary && (
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-left w-full">
          <p
            className={cn(
              "text-xs text-muted-foreground leading-relaxed transition-all",
              !isExpanded && "line-clamp-2"
            )}
          >
            {item.summary}
          </p>
          {item.summary.length > 120 && (
            <span className="text-[10px] text-primary mt-0.5 inline-block">
              {isExpanded ? "Show less" : "Read more"}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function NewsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border/50 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewsPanel({ news, isLoading = false }: NewsPanelProps) {
  const [filter, setFilter] = useState<FilterMode>("all");

  const counts = useMemo(() => {
    let positive = 0;
    let negative = 0;
    for (const n of news) {
      if (n.sentiment === "positive") positive++;
      else if (n.sentiment === "negative") negative++;
    }
    return { total: news.length, positive, negative };
  }, [news]);

  const filtered = useMemo(() => {
    if (filter === "all") return news;
    return news.filter((n) => n.sentiment === filter);
  }, [news, filter]);

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">News & Sentiment</CardTitle>
        </CardHeader>
        <CardContent>
          <NewsSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!news || news.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">News & Sentiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">No news found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">News & Sentiment</CardTitle>
        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{counts.total} articles</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
            <span className="text-green-500 font-semibold">{counts.positive}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
            <span className="text-red-500 font-semibold">{counts.negative}</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
          {(["all", "positive", "negative"] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                filter === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "all" ? "All" : mode === "positive" ? "Positive" : "Negative"}
            </button>
          ))}
        </div>

        {/* News List */}
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <NewsItemCard key={`${item.url}-${i}`} item={item} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No {filter} news found
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default NewsPanel;
