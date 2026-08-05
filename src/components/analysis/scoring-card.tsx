"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScoringCardProps {
  score: {
    value: number;
    trend: { score: number; weight: number; details: string[] };
    momentum: { score: number; weight: number; details: string[] };
    volume: { score: number; weight: number; details: string[] };
    risk: { score: number; weight: number; details: string[] };
    fundamental: { score: number; weight: number; details: string[] };
    technical: { score: number; weight: number; details: string[] };
    recommendation: string;
    analysisText: string;
  };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#84cc16";
  if (score >= 40) return "#eab308";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

function getScoreGradient(score: number): string {
  if (score >= 80) return "from-green-400 to-green-600";
  if (score >= 60) return "from-lime-400 to-green-500";
  if (score >= 40) return "from-yellow-400 to-yellow-600";
  if (score >= 20) return "from-orange-400 to-orange-600";
  return "from-red-400 to-red-600";
}

function getRecommendationStyle(rec: string): { variant: "success" | "warning" | "destructive" | "outline" | "default" | "secondary"; className: string } {
  const lower = rec.toLowerCase();
  if (lower.includes("strong buy")) return { variant: "success", className: "bg-green-500/10 text-green-500 border-green-500/20 text-base px-4 py-1.5" };
  if (lower.includes("buy") && !lower.includes("sell")) return { variant: "success", className: "bg-green-500/10 text-green-400 border-green-500/20 text-base px-4 py-1.5" };
  if (lower.includes("strong sell")) return { variant: "destructive", className: "bg-red-500/10 text-red-500 border-red-500/20 text-base px-4 py-1.5" };
  if (lower.includes("sell")) return { variant: "destructive", className: "bg-orange-500/10 text-orange-500 border-orange-500/20 text-base px-4 py-1.5" };
  return { variant: "outline", className: "text-yellow-500 border-yellow-500/20 text-base px-4 py-1.5" };
}

function CircularGauge({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const target = Math.min(Math.max(score, 0), 100);
    const duration = 1200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setAnimatedScore(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [score]);

  const radius = 70;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(Math.max(animatedScore, 0), 100);
  const dashOffset = circumference - (clampedScore / 100) * circumference;
  const color = getScoreColor(animatedScore);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="176" height="176" viewBox="0 0 176 176" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="88"
          cy="88"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/50"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          cx="88"
          cy="88"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-100"
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color }}
        >
          {animatedScore}
        </span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5">Score</span>
      </div>
    </div>
  );
}

interface BreakdownBarProps {
  label: string;
  weight: number;
  value: number;
}

function BreakdownBar({ label, weight, value }: BreakdownBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const color = getScoreColor(clampedValue);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">({weight}%)</span>
        </div>
        <span className="font-semibold tabular-nums" style={{ color }}>
          {clampedValue.toFixed(0)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}40`,
          }}
        />
      </div>
    </div>
  );
}

export function ScoringCard({ score }: ScoringCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const recStyle = getRecommendationStyle(score.recommendation);

  const breakdowns: BreakdownBarProps[] = [
    { label: "Trend", weight: 25, value: score.trend.score },
    { label: "Momentum", weight: 20, value: score.momentum.score },
    { label: "Volume", weight: 15, value: score.volume.score },
    { label: "Risk", weight: 15, value: score.risk.score },
    { label: "Fundamental", weight: 15, value: score.fundamental.score },
    { label: "Technical", weight: 10, value: score.technical.score },
  ];

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Analysis Score</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Circular Gauge */}
        <div className="flex flex-col items-center gap-4">
          <CircularGauge score={score.value} />

          <Badge variant={recStyle.variant} className={recStyle.className}>
            {score.recommendation}
          </Badge>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Score Breakdown
          </h4>
          {breakdowns.map((item) => (
            <BreakdownBar key={item.label} {...item} />
          ))}
        </div>

        {/* Analysis Text */}
        {score.analysisText && (
          <div className="rounded-lg border border-border/50 p-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Analysis
              </h4>
              <svg
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <p
              className={cn(
                "text-sm text-muted-foreground leading-relaxed mt-2 transition-all",
                !isExpanded && "line-clamp-3"
              )}
            >
              {score.analysisText}
            </p>
            {!isExpanded && score.analysisText.length > 200 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-xs text-primary mt-1 hover:underline"
              >
                Read more
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ScoringCard;
