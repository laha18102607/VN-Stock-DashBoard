'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import ChartContainer from '@/components/chart/chart-container';
import CompanyInfo from './company-info';
import ScoringCard from './scoring-card';
import IndicatorPanel from './indicator-panel';
import SmartMoneyPanel from './smart-money-panel';
import PatternPanel from './pattern-panel';
import NewsPanel from './news-panel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, BarChart3, Brain, CandlestickChart, Newspaper, TrendingUp, Activity } from 'lucide-react';
import { runAllIndicators } from '@/lib/indicators';
import { runSmartMoney } from '@/lib/smart-money';
import { runAllPatterns } from '@/lib/patterns';
import { runFullScoring } from '@/lib/scoring';

interface AnalysisPageProps {
  ticker: string;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function AnalysisPage({ ticker }: AnalysisPageProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [info, setInfo] = useState<any>(null);
  const [market, setMarket] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [histRes, infoRes, newsRes] = await Promise.all([
        fetch(`/api/stock/history?ticker=${ticker}&resolution=D`),
        fetch(`/api/stock/info?ticker=${ticker}`),
        fetch(`/api/news?ticker=${ticker}`),
      ]);

      if (!histRes.ok) throw new Error(`Failed to fetch price history: ${histRes.statusText}`);

      const histData = await histRes.json();
      setCandles(histData.data || []);

      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setInfo(infoData.info || null);
        setMarket(infoData.market || null);
      }

      if (newsRes.ok) {
        const newsData = await newsRes.json();
        setNews(newsData.news || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute indicators client-side
  const computedData = useMemo(() => {
    if (candles.length < 50) return null;

    const indicators = runAllIndicators(candles);
    const smartMoney = runSmartMoney(candles);
    const patterns = runAllPatterns(candles);
    const score = runFullScoring(candles, indicators, smartMoney, patterns, info);

    return { indicators, smartMoney, patterns, score };
  }, [candles, info]);

  // Build indicator data for chart overlay
  const chartIndicators = useMemo(() => {
    if (!computedData) return {};
    const ind = computedData.indicators;
    return {
      sma: ind.sma,
      ema: ind.ema,
      vwma: ind.vwma,
      bollingerBands: ind.bollingerBands,
      supertrend: ind.supertrend,
      donchianChannel: ind.donchianChannel,
      keltnerChannel: ind.keltnerChannel,
      rsi: ind.rsi,
      macd: ind.macd,
      stochastic: ind.stochastic,
      adx: ind.adx,
      obv: ind.obv,
      cci: ind.cci,
      mfi: ind.mfi,
    };
  }, [computedData]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Skeleton className="h-[560px] w-full" />
          </div>
          <Skeleton className="h-[560px] w-full" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Failed to load data</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Company Info */}
      {info && market && <CompanyInfo info={info} market={market} />}

      {/* Chart + Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartContainer
            candles={candles}
            ticker={ticker}
            marketData={market}
            indicators={chartIndicators}
          />
        </div>
        <div>
          {computedData?.score && (
            <ScoringCard score={computedData.score} />
          )}
        </div>
      </div>

      {/* Tabs: Indicators | Smart Money | Patterns | News */}
      <Tabs defaultValue="indicators" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="indicators" className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Indicators</span>
          </TabsTrigger>
          <TabsTrigger value="smart-money" className="flex items-center gap-1">
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Smart Money</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-1">
            <CandlestickChart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Patterns</span>
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center gap-1">
            <Newspaper className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">News</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indicators" className="mt-4">
          {computedData?.indicators && (
            <IndicatorPanel indicators={computedData.indicators} latestIndex={candles.length - 1} />
          )}
        </TabsContent>

        <TabsContent value="smart-money" className="mt-4">
          {computedData?.smartMoney && (
            <SmartMoneyPanel detections={computedData.smartMoney} />
          )}
        </TabsContent>

        <TabsContent value="patterns" className="mt-4">
          {computedData?.patterns && (
            <PatternPanel patterns={computedData.patterns} />
          )}
        </TabsContent>

        <TabsContent value="news" className="mt-4">
          <NewsPanel news={news} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
