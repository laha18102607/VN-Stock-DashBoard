"use client";

import { use } from "react";
import { useStockData } from "@/hooks/use-stock-data";
import SearchInput from "@/components/search/search-input";
import { addToHistory } from "@/components/search/search-history";
import ChartContainer from "@/components/chart/chart-container";
import { runAllIndicators } from "@/lib/indicators";
import {
  formatNumber,
  formatPercent,
  formatVolume,
  formatPrice,
  cn,
} from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  RefreshCw,
  Star,
  BarChart3,
  Newspaper,
  Activity,
  DollarSign,
  Building2,
  Clock,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";

interface StockPageProps {
  params: Promise<{ ticker: string }>;
}

export default function StockPage({ params }: StockPageProps) {
  const { ticker } = use(params);
  const upperTicker = ticker.toUpperCase();

  const { candles, info, market, news, isLoading, error, refetch } = useStockData({
    ticker: upperTicker,
    days: 365,
    autoRefresh: true,
    refreshInterval: 120000,
  });

  const [activeTab, setActiveTab] = useState<"overview" | "news" | "technical">(
    "overview"
  );

  // Compute chart indicators from candle data
  const chartIndicators = useMemo(() => {
    if (candles.length < 50) return undefined;
    try {
      return runAllIndicators(candles);
    } catch {
      return undefined;
    }
  }, [candles]);

  // Save to recently viewed
  useEffect(() => {
    if (info?.name) {
      addToHistory(upperTicker, info.name);
      saveToRecentlyViewed(upperTicker, info.name);
    }
  }, [upperTicker, info?.name]);

  const isPositive = (market?.changePercent || 0) >= 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
            </a>
            <div className="flex-1 max-w-md">
              <SearchInput size="sm" placeholder="Search another stock..." />
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-24 bg-muted rounded-xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-muted rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-muted rounded-xl" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Activity size={28} className="text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Unable to Load Data</h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {error}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Data Loaded */}
        {!isLoading && !error && (
          <>
            {/* Stock Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">{upperTicker}</h1>
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                    {info?.industry || "N/A"}
                  </span>
                  <button className="text-muted-foreground hover:text-yellow-500 transition-colors">
                    <Star size={18} />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {info?.name || upperTicker}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold tabular-nums">
                  {market?.price ? formatPrice(market.price) : "--"}
                </div>
                <div
                  className={cn(
                    "flex items-center justify-end gap-1 text-sm font-medium",
                    isPositive ? "text-bull" : "text-bear"
                  )}
                >
                  {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>
                    {market?.change
                      ? `${market.change > 0 ? "+" : ""}${market.change.toFixed(2)}`
                      : "--"}
                  </span>
                  <span>({market ? formatPercent(market.changePercent) : "--"})</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={<DollarSign size={16} />}
                label="Open"
                value={market?.open ? formatPrice(market.open) : "--"}
              />
              <StatCard
                icon={<TrendingUp size={16} />}
                label="Day High"
                value={market?.high ? formatPrice(market.high) : "--"}
              />
              <StatCard
                icon={<TrendingDown size={16} />}
                label="Day Low"
                value={market?.low ? formatPrice(market.low) : "--"}
              />
              <StatCard
                icon={<BarChart3 size={16} />}
                label="Volume"
                value={market?.volume ? formatVolume(market.volume) : "--"}
              />
            </div>

            {/* Tabs */}
            <div className="border-b border-border">
              <div className="flex gap-1">
                {[
                  { key: "overview", label: "Overview", icon: Building2 },
                  { key: "news", label: "News", icon: Newspaper },
                  { key: "technical", label: "Technical", icon: Activity },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() =>
                      setActiveTab(tab.key as "overview" | "news" | "technical")
                    }
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                      activeTab === tab.key
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <tab.icon size={15} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Company Info */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Company Info
                  </h3>
                  <InfoGrid>
                    <InfoRow label="Market Cap" value={info?.marketCap ? formatNumber(info.marketCap) : "N/A"} />
                    <InfoRow label="P/E Ratio" value={info?.pe ? info.pe.toFixed(2) : "N/A"} />
                    <InfoRow label="P/B Ratio" value={info?.pb ? info.pb.toFixed(2) : "N/A"} />
                    <InfoRow label="EPS" value={info?.eps ? formatPrice(info.eps) : "N/A"} />
                    <InfoRow label="ROE" value={info?.roe ? `${info.roe.toFixed(1)}%` : "N/A"} />
                    <InfoRow label="ROA" value={info?.roa ? `${info.roa.toFixed(1)}%` : "N/A"} />
                    <InfoRow label="Book Value" value={info?.bookValue ? formatPrice(info.bookValue) : "N/A"} />
                    <InfoRow label="Beta" value={info?.beta ? info.beta.toFixed(2) : "N/A"} />
                  </InfoGrid>
                </div>

                {/* Market Details */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Market Details
                  </h3>
                  <InfoGrid>
                    <InfoRow label="52W High" value={market?.high52w ? formatPrice(market.high52w) : "N/A"} />
                    <InfoRow label="52W Low" value={market?.low52w ? formatPrice(market.low52w) : "N/A"} />
                    <InfoRow label="Dividend Yield" value={market?.dividend ? `${market.dividend.toFixed(2)}%` : "N/A"} />
                    <InfoRow label="Volume" value={market?.volume ? formatVolume(market.volume) : "N/A"} />
                    <InfoRow label="Close" value={market?.close ? formatPrice(market.close) : "N/A"} />
                    <InfoRow label="Change %" value={market ? formatPercent(market.changePercent) : "N/A"} isPositive={isPositive} />
                  </InfoGrid>
                </div>

                {/* Interactive TradingView Chart */}
                {candles.length > 0 && (
                  <div className="lg:col-span-2">
                    <ChartContainer
                      candles={candles}
                      ticker={upperTicker}
                      marketData={market}
                      indicators={chartIndicators}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === "news" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Latest News ({news.length} articles)
                </h3>
                {news.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Newspaper size={32} className="mx-auto mb-3 opacity-50" />
                    <p>No news articles found for {upperTicker}</p>
                  </div>
                )}
                {news.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm leading-snug line-clamp-2">
                          {item.title}
                        </h4>
                        {item.summary && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {item.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[11px] text-muted-foreground">
                            {item.source}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(item.publishedAt).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      </div>
                      <SentimentBadge sentiment={item.sentiment} />
                    </div>
                  </a>
                ))}
              </div>
            )}

            {activeTab === "technical" && (
              <div className="space-y-6">
                {candles.length > 0 && (
                  <>
                    {/* Simple Moving Averages */}
                    <div className="rounded-xl border border-border bg-card p-5">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                        Moving Averages
                      </h3>
                      <MovingAverageDisplay candles={candles} currentPrice={market?.price || 0} />
                    </div>

                    {/* Interactive TradingView Chart */}
                    <ChartContainer
                      candles={candles}
                      ticker={upperTicker}
                      marketData={market}
                      indicators={chartIndicators}
                    />

                    {/* Volume Analysis */}
                    <div className="rounded-xl border border-border bg-card p-5">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                        Volume Analysis
                      </h3>
                      <VolumeDisplay candles={candles} />
                    </div>
                  </>
                )}
                {candles.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity size={32} className="mx-auto mb-3 opacity-50" />
                    <p>No price data available for technical analysis</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ---------- Sub-components ----------

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}

function InfoRow({
  label,
  value,
  isPositive,
}: {
  label: string;
  value: string;
  isPositive?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-medium tabular-nums",
          isPositive === true && "text-bull",
          isPositive === false && "text-bear"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SentimentBadge({
  sentiment,
}: {
  sentiment: "positive" | "negative" | "neutral";
}) {
  const config = {
    positive: { bg: "bg-bull/10", text: "text-bull", label: "Positive" },
    negative: { bg: "bg-bear/10", text: "text-bear", label: "Negative" },
    neutral: { bg: "bg-muted", text: "text-muted-foreground", label: "Neutral" },
  };
  const c = config[sentiment];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
        c.bg,
        c.text
      )}
    >
      {c.label}
    </span>
  );
}

function MiniCandleChart({ candles }: { candles: { time: string; close: number; volume: number }[] }) {
  if (candles.length === 0) return null;

  const last60 = candles.slice(-60);
  const maxPrice = Math.max(...last60.map((c) => c.close));
  const minPrice = Math.min(...last60.map((c) => c.close));
  const range = maxPrice - minPrice || 1;

  const maxVol = Math.max(...last60.map((c) => c.volume));

  return (
    <div className="space-y-4">
      {/* Price line */}
      <div className="relative h-40">
        <div className="flex items-end h-full gap-px">
          {last60.map((c, i) => {
            const height = ((c.close - minPrice) / range) * 100;
            const prevClose = i > 0 ? last60[i - 1].close : c.close;
            const isUp = c.close >= prevClose;

            return (
              <div
                key={c.time}
                className="flex-1 relative group"
                style={{ height: `${Math.max(height, 2)}%` }}
              >
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all",
                    isUp ? "bg-bull/70" : "bg-bear/70"
                  )}
                  style={{ height: "100%" }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-popover border border-border rounded-md px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                    <div className="font-medium">{c.time}</div>
                    <div>{formatPrice(c.close)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Y-axis labels */}
        <div className="absolute right-0 top-0 text-[10px] text-muted-foreground">
          {formatPrice(maxPrice)}
        </div>
        <div className="absolute right-0 bottom-0 text-[10px] text-muted-foreground">
          {formatPrice(minPrice)}
        </div>
      </div>

      {/* Volume bars */}
      <div className="relative h-16">
        <div className="flex items-end h-full gap-px">
          {last60.map((c) => {
            const volHeight = (c.volume / maxVol) * 100;
            return (
              <div
                key={c.time}
                className="flex-1 bg-primary/30 rounded-t-sm"
                style={{ height: `${Math.max(volHeight, 1)}%` }}
              />
            );
          })}
        </div>
        <div className="absolute right-0 top-0 text-[10px] text-muted-foreground">
          Vol: {formatVolume(maxVol)}
        </div>
      </div>
    </div>
  );
}

function MovingAverageDisplay({
  candles,
  currentPrice,
}: {
  candles: { close: number }[];
  currentPrice: number;
}) {
  const computeMA = (period: number) => {
    if (candles.length < period) return null;
    const slice = candles.slice(-period);
    return slice.reduce((sum, c) => sum + c.close, 0) / period;
  };

  const ma10 = computeMA(10);
  const ma20 = computeMA(20);
  const ma50 = computeMA(50);
  const ma100 = computeMA(100);
  const ma200 = computeMA(200);

  const mas = [
    { label: "MA10", value: ma10 },
    { label: "MA20", value: ma20 },
    { label: "MA50", value: ma50 },
    { label: "MA100", value: ma100 },
    { label: "MA200", value: ma200 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {mas.map((ma) => {
        if (!ma.value) return null;
        const diff = currentPrice > 0 ? ((currentPrice - ma.value) / ma.value) * 100 : 0;
        const isAbove = diff >= 0;

        return (
          <div key={ma.label} className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground font-medium">{ma.label}</div>
            <div className="text-sm font-semibold tabular-nums mt-1">
              {formatPrice(ma.value)}
            </div>
            <div
              className={cn(
                "text-xs font-medium mt-0.5",
                isAbove ? "text-bull" : "text-bear"
              )}
            >
              {isAbove ? "+" : ""}
              {diff.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VolumeDisplay({
  candles,
}: {
  candles: { volume: number; time: string }[];
}) {
  if (candles.length === 0) return null;

  const avgVol20 =
    candles.slice(-20).reduce((s, c) => s + c.volume, 0) /
    Math.min(candles.length, 20);
  const avgVol50 =
    candles.slice(-50).reduce((s, c) => s + c.volume, 0) /
    Math.min(candles.length, 50);
  const lastVol = candles[candles.length - 1]?.volume || 0;
  const volRatio = avgVol20 > 0 ? lastVol / avgVol20 : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-lg border border-border p-3">
        <div className="text-xs text-muted-foreground">Last Volume</div>
        <div className="text-sm font-semibold tabular-nums mt-1">
          {formatVolume(lastVol)}
        </div>
      </div>
      <div className="rounded-lg border border-border p-3">
        <div className="text-xs text-muted-foreground">Avg Vol (20D)</div>
        <div className="text-sm font-semibold tabular-nums mt-1">
          {formatVolume(avgVol20)}
        </div>
      </div>
      <div className="rounded-lg border border-border p-3">
        <div className="text-xs text-muted-foreground">Avg Vol (50D)</div>
        <div className="text-sm font-semibold tabular-nums mt-1">
          {formatVolume(avgVol50)}
        </div>
      </div>
      <div className="rounded-lg border border-border p-3">
        <div className="text-xs text-muted-foreground">Vol Ratio</div>
        <div
          className={cn(
            "text-sm font-semibold tabular-nums mt-1",
            volRatio > 1.5 ? "text-bull" : volRatio < 0.5 ? "text-bear" : ""
          )}
        >
          {volRatio.toFixed(2)}x
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers ----------

function saveToRecentlyViewed(ticker: string, name: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = "vn-stock-recently-viewed";
    const raw = localStorage.getItem(key);
    let items: { ticker: string; name: string; timestamp: number }[] = raw
      ? JSON.parse(raw)
      : [];

    items = items.filter((i) => i.ticker !== ticker);
    items.unshift({ ticker, name, timestamp: Date.now() });
    items = items.slice(0, 10);

    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore
  }
}
