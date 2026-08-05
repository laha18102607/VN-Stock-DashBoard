"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PatternDetection {
  name: string;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  explanation: string;
  index: number;
}

interface PatternPanelProps {
  patterns: Record<string, PatternDetection>;
}

type FilterMode = "all" | "bullish" | "bearish";

function getStrengthLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 70) return { label: "Strong", color: "text-green-500" };
  if (confidence >= 40) return { label: "Moderate", color: "text-yellow-500" };
  return { label: "Weak", color: "text-red-500" };
}

function DirectionIcon({ direction }: { direction: "bullish" | "bearish" | "neutral" }) {
  if (direction === "bullish") {
    return (
      <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l5-5 5 5M7 11l5-5 5 5" />
      </svg>
    );
  }
  if (direction === "bearish") {
    return (
      <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-5 5-5-5M17 13l-5 5-5-5" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const barColor =
    pct >= 70
      ? "bg-green-500"
      : pct >= 40
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums font-semibold w-9 text-right">{pct}%</span>
    </div>
  );
}

function PatternCard({ pattern }: { pattern: PatternDetection }) {
  const confidencePct = pattern.confidence <= 1 ? pattern.confidence * 100 : pattern.confidence;
  const strength = getStrengthLabel(confidencePct);
  const isBullish = pattern.direction === "bullish";
  const isBearish = pattern.direction === "bearish";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3 transition-colors",
        isBullish && "border-green-500/20 bg-green-500/5 dark:bg-green-500/5",
        isBearish && "border-red-500/20 bg-red-500/5 dark:bg-red-500/5",
        !isBullish && !isBearish && "border-border/50"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DirectionIcon direction={pattern.direction} />
          <span className="text-sm font-semibold">{pattern.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isBullish ? "success" : isBearish ? "destructive" : "outline"}
            className="text-[10px]"
          >
            {pattern.direction}
          </Badge>
          <span className={cn("text-[10px] font-semibold", strength.color)}>
            {strength.label}
          </span>
        </div>
      </div>

      <ConfidenceBar value={confidencePct} />

      <p className="text-xs text-muted-foreground leading-relaxed">
        {pattern.explanation}
      </p>

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Candle #{pattern.index}</span>
      </div>
    </div>
  );
}

export function PatternPanel({ patterns }: PatternPanelProps) {
  const [filter, setFilter] = useState<FilterMode>("all");

  const patternList = useMemo(() => Object.values(patterns), [patterns]);

  const counts = useMemo(() => {
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    for (const p of patternList) {
      if (p.direction === "bullish") bullish++;
      else if (p.direction === "bearish") bearish++;
      else neutral++;
    }
    return { total: patternList.length, bullish, bearish, neutral };
  }, [patternList]);

  const filtered = useMemo(() => {
    if (filter === "all") return patternList;
    return patternList.filter((p) => p.direction === filter);
  }, [patternList, filter]);

  if (!patternList || patternList.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">Candlestick Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">No candlestick patterns detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Candlestick Patterns</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-3 pt-1">
          <span className="font-semibold text-foreground">{counts.total} patterns</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
            <span className="text-green-500 font-semibold">{counts.bullish}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
            <span className="text-red-500 font-semibold">{counts.bearish}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-400 inline-block" />
            <span className="text-gray-400 font-semibold">{counts.neutral}</span>
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
          {(["all", "bullish", "bearish"] as FilterMode[]).map((mode) => (
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
              {mode === "all" ? "All" : mode === "bullish" ? "Bullish" : "Bearish"}
            </button>
          ))}
        </div>

        {/* Pattern List */}
        <div className="space-y-3">
          {filtered.map((pattern, i) => (
            <PatternCard key={`${pattern.name}-${pattern.index}-${i}`} pattern={pattern} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No {filter} patterns found
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default PatternPanel;
