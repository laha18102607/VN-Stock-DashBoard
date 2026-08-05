"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import SearchInput from "@/components/search/search-input";
import { useMarketData } from "@/hooks/use-stock-data";
import {
  cn,
  formatPrice,
  formatPercent,
  formatVolume,
} from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Clock,
  RefreshCw,
  Moon,
  Sun,
  Search,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";

interface RecentlyViewed {
  ticker: string;
  name: string;
  timestamp: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { indices, gainers, losers, active, isLoading, error, refetch } =
    useMarketData(true, 60000);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewed[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load recently viewed from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("vn-stock-recently-viewed");
      if (raw) {
        setRecentlyViewed(JSON.parse(raw));
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    setLastUpdated(new Date());
  }, [refetch]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Activity size={18} className="text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold tracking-tight hidden sm:block">
                VN Stock Analysis
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString("vi-VN")}
            </span>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground"
              title="Refresh data"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-10">
        {/* Hero Section */}
        <section className="text-center space-y-6 py-6">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Vietnamese Stock Market
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Real-time market data, in-depth analysis, and smart insights for
              Vietnam&apos;s stock exchanges.
            </p>
          </div>
          <div className="max-w-xl mx-auto">
            <SearchInput
              size="lg"
              placeholder="Search stocks... (e.g., VCB, FPT, HPG)"
              autoFocus
            />
          </div>
        </section>

        {/* Market Overview */}
        <section>
          <SectionHeader
            icon={<BarChart3 size={18} />}
            title="Market Overview"
            subtitle="Major indices"
          />
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {indices.map((idx) => (
                <IndexCard key={idx.name} {...idx} />
              ))}
              {indices.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                  Market data temporarily unavailable
                </div>
              )}
            </div>
          )}
        </section>

        {/* Top Gainers */}
        <section>
          <SectionHeader
            icon={<TrendingUp size={18} className="text-bull" />}
            title="Top Gainers"
            subtitle="Best performers today"
          />
          <MoverRow
            items={gainers}
            isLoading={isLoading}
            onNavigate={(t) => router.push(`/stock/${t}`)}
          />
        </section>

        {/* Top Losers */}
        <section>
          <SectionHeader
            icon={<TrendingDown size={18} className="text-bear" />}
            title="Top Losers"
            subtitle="Worst performers today"
          />
          <MoverRow
            items={losers}
            isLoading={isLoading}
            onNavigate={(t) => router.push(`/stock/${t}`)}
          />
        </section>

        {/* Most Active */}
        <section>
          <SectionHeader
            icon={<Activity size={18} className="text-primary" />}
            title="Most Active"
            subtitle="Highest volume today"
          />
          <MoverRow
            items={active}
            isLoading={isLoading}
            onNavigate={(t) => router.push(`/stock/${t}`)}
          />
        </section>

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <section>
            <SectionHeader
              icon={<Clock size={18} className="text-muted-foreground" />}
              title="Recently Viewed"
              subtitle="Your recent searches"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {recentlyViewed.map((item) => (
                <button
                  key={item.ticker}
                  onClick={() => router.push(`/stock/${item.ticker}`)}
                  className="group rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/50 transition-all hover:border-primary/30"
                >
                  <div className="font-bold text-sm">{item.ticker}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>View</span>
                    <ChevronRight size={12} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Quick Search Tags */}
        <section className="pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-2">
              Popular:
            </span>
            {[
              "VCB", "FPT", "HPG", "VIC", "VNM", "MSN", "TCB", "MBB",
              "VPB", "SSI", "ACB", "MWG", "VHM", "GAS", "BID", "CTG",
            ].map((ticker) => (
              <button
                key={ticker}
                onClick={() => router.push(`/stock/${ticker}`)}
                className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all"
              >
                {ticker}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>VN Stock Analysis - Vietnamese Stock Market Data & Insights</span>
          <span>
            Data from CafeF, Yahoo Finance. For informational purposes only.
          </span>
        </div>
      </footer>
    </div>
  );
}

// ---------- Sub-components ----------

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function IndexCard({
  name,
  value,
  change,
  changePercent,
  volume,
}: {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  volume: number;
}) {
  const isPositive = changePercent >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-all",
        isPositive
          ? "border-bull/20 hover:border-bull/40"
          : "border-bear/20 hover:border-bear/40"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{name}</span>
        {isPositive ? (
          <TrendingUp size={14} className="text-bull" />
        ) : (
          <TrendingDown size={14} className="text-bear" />
        )}
      </div>
      <div className="text-xl font-bold tabular-nums">
        {value > 0 ? formatPrice(value) : "--"}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            isPositive ? "text-bull" : "text-bear"
          )}
        >
          {value > 0 ? formatPercent(changePercent) : "--"}
        </span>
        {change !== 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            ({change > 0 ? "+" : ""}
            {change.toFixed(2)})
          </span>
        )}
      </div>
      {volume > 0 && (
        <div className="text-[11px] text-muted-foreground mt-1">
          Vol: {formatVolume(volume)}
        </div>
      )}
    </div>
  );
}

function MoverRow({
  items,
  isLoading,
  onNavigate,
}: {
  items: {
    ticker: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }[];
  isLoading: boolean;
  onNavigate: (ticker: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="shrink-0 w-44 h-24 rounded-xl bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
      {items.map((item) => {
        const isPositive = item.changePercent >= 0;

        return (
          <button
            key={item.ticker}
            onClick={() => onNavigate(item.ticker)}
            className={cn(
              "shrink-0 w-44 rounded-xl border bg-card p-3.5 text-left transition-all",
              "hover:shadow-md hover:-translate-y-0.5",
              isPositive
                ? "border-bull/20 hover:border-bull/40"
                : "border-bear/20 hover:border-bear/40"
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm">{item.ticker}</span>
              {isPositive ? (
                <TrendingUp size={12} className="text-bull" />
              ) : (
                <TrendingDown size={12} className="text-bear" />
              )}
            </div>
            <div className="text-base font-semibold tabular-nums">
              {item.price > 0 ? formatPrice(item.price) : "--"}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  isPositive ? "text-bull" : "text-bear"
                )}
              >
                {formatPercent(item.changePercent)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {item.volume > 0 ? formatVolume(item.volume) : ""}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
