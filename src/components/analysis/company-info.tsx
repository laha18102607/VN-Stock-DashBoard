"use client";

import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  cn,
  formatPrice,
  formatVolume,
  formatPercent,
  colorForChange,
} from "@/lib/utils";

interface CompanyInfoProps {
  info: {
    name: string;
    industry: string;
    marketCap: number;
    pe: number;
    pb: number;
    eps: number;
    roe: number;
    roa: number;
    bookValue: number;
    beta: number;
  };
  market: {
    price: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    high52w: number;
    low52w: number;
    dividend: number;
    change: number;
    changePercent: number;
  };
}

function formatMarketCap(value: number): string {
  if (value == null || isNaN(value)) return "---";
  if (value >= 1e12) return (value / 1e12).toFixed(1) + " nghin t";
  if (value >= 1e9) return (value / 1e9).toFixed(1) + " t";
  if (value >= 1e6) return (value / 1e6).toFixed(1) + " tr";
  return value.toLocaleString("vi-VN");
}

function formatNumber(value: number, decimals: number = 2): string {
  if (value == null || isNaN(value)) return "---";
  return value.toFixed(decimals);
}

function MetricCell({
  label,
  value,
  highlight,
  className,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          highlight && "text-lg",
          className
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RangeBar({
  low,
  high,
  current,
  label,
}: {
  low: number;
  high: number;
  current: number;
  label: string;
}) {
  const range = high - low;
  const position = range > 0 ? Math.min(Math.max((current - low) / range, 0), 1) * 100 : 50;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{formatNumber(position, 1)}%</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
          style={{ width: "100%" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-foreground shadow-md border border-background"
          style={{ left: `${position}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
      <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
        <span>{formatPrice(low)}</span>
        <span className="font-semibold text-foreground">{formatPrice(current)}</span>
        <span>{formatPrice(high)}</span>
      </div>
    </div>
  );
}

export function CompanyInfo({ info, market }: CompanyInfoProps) {
  const ticker = info.name.split(" - ")[0] || info.name;
  const displayName = info.name.includes(" - ")
    ? info.name.split(" - ").slice(1).join(" - ")
    : info.name;

  const exchange = useMemo(() => {
    if (ticker.endsWith(".VN")) return "HOSE";
    if (ticker.endsWith(".HN")) return "HNX";
    if (ticker.endsWith(".UP")) return "UPCOM";
    return "HOSE";
  }, [ticker]);

  const priceColor = colorForChange(market.change);
  const isPositive = market.change >= 0;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl">{displayName}</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-muted-foreground">
                {ticker}
              </span>
              <Badge variant="secondary" className="text-xs">
                {exchange}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {info.industry}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className={cn("text-2xl sm:text-3xl font-bold tabular-nums", priceColor)}>
              {formatPrice(market.price)}
            </div>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <span className={cn("text-sm font-semibold tabular-nums", priceColor)}>
                {isPositive ? "+" : ""}{formatNumber(market.change, 0)}
              </span>
              <Badge
                variant={isPositive ? "success" : "destructive"}
                className="text-xs"
              >
                {formatPercent(market.changePercent)}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCell label="Open" value={formatPrice(market.open)} />
          <MetricCell label="High" value={formatPrice(market.high)} className="text-green-500" />
          <MetricCell label="Low" value={formatPrice(market.low)} className="text-red-500" />
          <MetricCell label="Close" value={formatPrice(market.close)} />
          <MetricCell label="Volume" value={formatVolume(market.volume)} />
          <MetricCell label="Market Cap" value={formatMarketCap(info.marketCap)} />
          <MetricCell label="P/E" value={formatNumber(info.pe)} />
          <MetricCell label="P/B" value={formatNumber(info.pb)} />
          <MetricCell label="EPS" value={formatPrice(info.eps)} />
          <MetricCell label="ROE" value={formatNumber(info.roe) + "%"} />
          <MetricCell label="ROA" value={formatNumber(info.roa) + "%"} />
          <MetricCell label="Beta" value={formatNumber(info.beta)} />
          <MetricCell label="Book Value" value={formatPrice(info.bookValue)} />
          <MetricCell
            label="Dividend Yield"
            value={info.marketCap > 0 ? formatNumber(market.dividend) + "%" : "---"}
          />
        </div>

        {/* 52-Week Range */}
        <div className="rounded-lg border border-border/50 p-4 space-y-2">
          <RangeBar
            low={market.low52w}
            high={market.high52w}
            current={market.price}
            label="52-Week Range"
          />
        </div>

        {/* Today's Range */}
        <div className="rounded-lg border border-border/50 p-4 space-y-2">
          <RangeBar
            low={market.low}
            high={market.high}
            current={market.price}
            label="Today's Range"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default CompanyInfo;
