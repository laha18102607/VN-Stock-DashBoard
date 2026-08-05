"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { OHLCCandle, StockInfo, MarketData, NewsItem } from "@/lib/types";

interface StockDataState {
  candles: OHLCCandle[];
  info: StockInfo | null;
  market: MarketData | null;
  news: NewsItem[];
  isLoading: boolean;
  error: string | null;
}

interface UseStockDataOptions {
  ticker: string;
  days?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseStockDataReturn extends StockDataState {
  refetch: () => Promise<void>;
}

export function useStockData({
  ticker,
  days = 365,
  autoRefresh = false,
  refreshInterval = 60000,
}: UseStockDataOptions): UseStockDataReturn {
  const [state, setState] = useState<StockDataState>({
    candles: [],
    info: null,
    market: null,
    news: [],
    isLoading: true,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!ticker) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = toDate.toISOString().split("T")[0];

    try {
      const [historyRes, infoRes, newsRes] = await Promise.allSettled([
        fetch(`/api/stock/history?ticker=${ticker}&resolution=D&from=${fromStr}&to=${toStr}`, {
          signal: abortControllerRef.current.signal,
        }),
        fetch(`/api/stock/info?ticker=${ticker}`, {
          signal: abortControllerRef.current.signal,
        }),
        fetch(`/api/news?ticker=${ticker}`, {
          signal: abortControllerRef.current.signal,
        }),
      ]);

      let candles: OHLCCandle[] = [];
      let info: StockInfo | null = null;
      let market: MarketData | null = null;
      let news: NewsItem[] = [];

      // Parse history
      if (historyRes.status === "fulfilled" && historyRes.value.ok) {
        const data = await historyRes.value.json();
        candles = data.data || [];
      }

      // Parse info
      if (infoRes.status === "fulfilled" && infoRes.value.ok) {
        const data = await infoRes.value.json();
        info = data.info || null;
        market = data.market || null;
      }

      // Parse news
      if (newsRes.status === "fulfilled" && newsRes.value.ok) {
        const data = await newsRes.value.json();
        news = data.news || [];
      }

      setState({
        candles,
        info,
        market,
        news,
        isLoading: false,
        error:
          !candles.length && !info
            ? "Failed to load stock data. Please try again."
            : null,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Network error. Please check your connection and try again.",
      }));
    }
  }, [ticker, days]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

// ---------- Hook for market data ----------

interface MarketDataState {
  indices: Array<{
    name: string;
    value: number;
    change: number;
    changePercent: number;
    volume: number;
  }>;
  gainers: Array<{
    ticker: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }>;
  losers: Array<{
    ticker: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }>;
  active: Array<{
    ticker: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }>;
  isLoading: boolean;
  error: string | null;
}

export function useMarketData(
  autoRefresh = true,
  refreshInterval = 60000
): MarketDataState & { refetch: () => Promise<void> } {
  const [state, setState] = useState<MarketDataState>({
    indices: [],
    gainers: [],
    losers: [],
    active: [],
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/stock/market");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setState({
        indices: data.indices || [],
        gainers: data.gainers || [],
        losers: data.losers || [],
        active: data.active || [],
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to load market data. Please try again.",
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { ...state, refetch: fetchData };
}
