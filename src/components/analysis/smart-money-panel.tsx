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
import { cn, formatPrice } from "@/lib/utils";

interface SmartMoneyDetection {
  type: string;
  direction: "bullish" | "bearish";
  price: number;
  confidence: number;
  explanation: string;
  index: number;
}

interface SmartMoneyPanelProps {
  detections: {
    breakOfStructure?: SmartMoneyDetection[];
    changeOfCharacter?: SmartMoneyDetection[];
    liquiditySweep?: SmartMoneyDetection[];
    orderBlocks?: SmartMoneyDetection[];
    fairValueGaps?: SmartMoneyDetection[];
    equalHighsLows?: SmartMoneyDetection[];
    premiumDiscount?: SmartMoneyDetection | null;
    mitigations?: SmartMoneyDetection[];
    breakerBlocks?: SmartMoneyDetection[];
  };
}

type FilterMode = "all" | "bullish" | "bearish";
type SortMode = "recent" | "confidence";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const color =
    pct >= 70
      ? "bg-green-500"
      : pct >= 40
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums font-medium text-muted-foreground w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}

function DetectionCard({
  detection,
  isExpanded,
  onToggle,
}: {
  detection: SmartMoneyDetection;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isBullish = detection.direction === "bullish";

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />

      {/* Dot */}
      <div
        className={cn(
          "relative z-10 mt-1 h-3.5 w-3.5 rounded-full border-2 border-background shrink-0",
          isBullish ? "bg-green-500 shadow-green-500/30 shadow-md" : "bg-red-500 shadow-red-500/30 shadow-md"
        )}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs font-mono"
          >
            {detection.type}
          </Badge>
          <Badge
            variant={isBullish ? "success" : "destructive"}
            className="text-[10px]"
          >
            {isBullish ? "Bullish" : "Bearish"}
          </Badge>
          <span className="text-xs text-muted-foreground tabular-nums">
            #{detection.index}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tabular-nums">
            {formatPrice(detection.price)}
          </span>
        </div>

        <ConfidenceBar value={detection.confidence <= 1 ? detection.confidence * 100 : detection.confidence} />

        <button
          onClick={onToggle}
          className="text-left"
        >
          <p
            className={cn(
              "text-xs text-muted-foreground transition-all",
              !isExpanded && "line-clamp-1"
            )}
          >
            {detection.explanation}
          </p>
          {detection.explanation.length > 80 && (
            <span className="text-[10px] text-primary mt-0.5 inline-block">
              {isExpanded ? "Show less" : "Show more"}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export function SmartMoneyPanel({ detections }: SmartMoneyPanelProps) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("recent");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Flatten SmartMoneyResult into a single array
  const allDetections = useMemo(() => {
    const result: SmartMoneyDetection[] = [];
    if (detections.breakOfStructure) result.push(...detections.breakOfStructure);
    if (detections.changeOfCharacter) result.push(...detections.changeOfCharacter);
    if (detections.liquiditySweep) result.push(...detections.liquiditySweep);
    if (detections.orderBlocks) result.push(...detections.orderBlocks);
    if (detections.fairValueGaps) result.push(...detections.fairValueGaps);
    if (detections.equalHighsLows) result.push(...detections.equalHighsLows);
    if (detections.premiumDiscount) result.push(detections.premiumDiscount);
    if (detections.mitigations) result.push(...detections.mitigations);
    if (detections.breakerBlocks) result.push(...detections.breakerBlocks);
    return result;
  }, [detections]);

  const { bullishCount, bearishCount } = useMemo(() => {
    let b = 0;
    let s = 0;
    for (const d of allDetections) {
      if (d.direction === "bullish") b++;
      else s++;
    }
    return { bullishCount: b, bearishCount: s };
  }, [allDetections]);

  const filteredAndSorted = useMemo(() => {
    let items = [...allDetections];

    if (filter === "bullish") items = items.filter((d) => d.direction === "bullish");
    else if (filter === "bearish") items = items.filter((d) => d.direction === "bearish");

    if (sort === "recent") items.sort((a, b) => b.index - a.index);
    else items.sort((a, b) => b.confidence - a.confidence);

    return items;
  }, [allDetections, filter, sort]);

  if (!allDetections || allDetections.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">Smart Money Concepts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">No Smart Money signals detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Smart Money Concepts</CardTitle>
        <CardDescription className="flex items-center gap-3 pt-1">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
            <span className="text-green-500 font-semibold">{bullishCount} bullish</span>
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
            <span className="text-red-500 font-semibold">{bearishCount} bearish</span>
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter and Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {(["all", "bullish", "bearish"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  filter === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode === "all" ? "All" : mode === "bullish" ? "Bullish" : "Bearish"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-muted p-1 ml-auto">
            {(["recent", "confidence"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSort(mode)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  sort === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode === "recent" ? "Recent" : "Confidence"}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-0 pt-2">
          {filteredAndSorted.map((detection, i) => (
            <DetectionCard
              key={`${detection.type}-${detection.index}-${i}`}
              detection={detection}
              isExpanded={expandedIndex === i}
              onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
            />
          ))}
        </div>

        {filteredAndSorted.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No {filter} signals found
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default SmartMoneyPanel;
