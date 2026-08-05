'use client';

import { useState, useMemo, useCallback } from 'react';
import TradingViewChart from './tradingview-chart';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatPrice, formatPercent } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Maximize2,
  Minimize2,
  Settings2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketData {
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface IndicatorData {
  sma?: { values: number[]; period: number };
  ema?: { values: number[]; period: number };
  vwma?: { values: number[]; period: number };
  bollingerBands?: { values: { upper: number; middle: number; lower: number }[]; period: number };
  supertrend?: { values: { value: number; trend: 'up' | 'down' }[]; period: number };
  parabolicSAR?: { values: { sar: number; trend: 'up' | 'down' }[] };
  donchianChannel?: { values: { upper: number; middle: number; lower: number }[]; period: number };
  keltnerChannel?: { values: { upper: number; middle: number; lower: number }[]; period: number };
  rsi?: { values: number[]; period: number };
  macd?: { values: { macdLine: number; signalLine: number; histogram: number }[] };
  stochastic?: { values: { k: number; d: number }[] };
  adx?: { values: { adx: number; plusDI: number; minusDI: number }[] };
  obv?: { values: number[] };
  cci?: { values: number[]; period: number };
  mfi?: { values: number[]; period: number };
  [key: string]: unknown;
}

interface ChartContainerProps {
  candles: Candle[];
  ticker: string;
  marketData?: MarketData;
  indicators?: IndicatorData;
}

const TIMEFRAMES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: Infinity },
];

const OVERLAY_INDICATORS = ['sma', 'ema', 'vwma', 'bollingerBands', 'supertrend', 'donchianChannel', 'keltnerChannel'];
const PANE_INDICATORS = ['rsi', 'macd', 'stochastic', 'adx', 'obv', 'cci', 'mfi'];

const INDICATOR_LABELS: Record<string, string> = {
  sma: 'SMA',
  ema: 'EMA',
  vwma: 'VWMA',
  bollingerBands: 'Bollinger Bands',
  supertrend: 'Supertrend',
  donchianChannel: 'Donchian',
  keltnerChannel: 'Keltner',
  rsi: 'RSI',
  macd: 'MACD',
  stochastic: 'Stochastic',
  adx: 'ADX',
  obv: 'OBV',
  cci: 'CCI',
  mfi: 'MFI',
};

export default function ChartContainer({ candles, ticker, marketData, indicators }: ChartContainerProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('ALL');
  const [visibleIndicators, setVisibleIndicators] = useState<Set<string>>(new Set(['sma', 'ema', 'rsi', 'macd', 'bollingerBands']));
  const [showPanel, setShowPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const filteredCandles = useMemo(() => {
    const tf = TIMEFRAMES.find((t) => t.label === selectedTimeframe);
    if (!tf || tf.days === Infinity) return candles;
    const cutoff = Date.now() - tf.days * 24 * 60 * 60 * 1000;
    return candles.filter((c) => c.time >= cutoff);
  }, [candles, selectedTimeframe]);

  const toggleIndicator = useCallback((key: string) => {
    setVisibleIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (group: string[]) => {
      setVisibleIndicators((prev) => {
        const allOn = group.every((k) => prev.has(k));
        const next = new Set(prev);
        group.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
        return next;
      });
    },
    []
  );

  const price = marketData?.price ?? candles[candles.length - 1]?.close ?? 0;
  const change = marketData?.change ?? 0;
  const changePct = marketData?.changePercent ?? 0;
  const isUp = change >= 0;

  return (
    <Card className={cn('overflow-hidden', isFullscreen && 'fixed inset-0 z-50 rounded-none')}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight">{ticker}</h2>
          <span className="text-2xl font-bold font-mono">{formatPrice(price)}</span>
          <Badge variant={isUp ? 'success' : 'destructive'} className="text-sm font-mono">
            {isUp ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
            {isUp ? '+' : ''}
            {change.toFixed(0)} ({formatPercent(changePct)})
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowPanel(!showPanel)} title="Indicators">
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} title="Fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Chart area */}
        <div className="flex-1 min-w-0">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 border-b border-border px-4 py-2">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.label}
                variant={selectedTimeframe === tf.label ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setSelectedTimeframe(tf.label)}
              >
                {tf.label}
              </Button>
            ))}
          </div>

          {/* Chart */}
          <div className="p-2">
            <TradingViewChart
              candles={filteredCandles}
              indicators={indicators}
              visibleIndicators={visibleIndicators}
              height={isFullscreen ? window.innerHeight - 120 : 500}
            />
          </div>
        </div>

        {/* Indicator panel */}
        {showPanel && (
          <div className="w-56 shrink-0 border-l border-border overflow-y-auto max-h-[560px]">
            <div className="p-3 space-y-3">
              {/* Overlay indicators */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overlay</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] px-1"
                    onClick={() => toggleAll(OVERLAY_INDICATORS)}
                  >
                    {OVERLAY_INDICATORS.every((k) => visibleIndicators.has(k)) ? 'None' : 'All'}
                  </Button>
                </div>
                <div className="space-y-1">
                  {OVERLAY_INDICATORS.map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={visibleIndicators.has(key)}
                        onChange={() => toggleIndicator(key)}
                        className="rounded border-border"
                      />
                      <span className="truncate">{INDICATOR_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pane indicators */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Separate Pane</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] px-1"
                    onClick={() => toggleAll(PANE_INDICATORS)}
                  >
                    {PANE_INDICATORS.every((k) => visibleIndicators.has(k)) ? 'None' : 'All'}
                  </Button>
                </div>
                <div className="space-y-1">
                  {PANE_INDICATORS.map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={visibleIndicators.has(key)}
                        onChange={() => toggleIndicator(key)}
                        className="rounded border-border"
                      />
                      <span className="truncate">{INDICATOR_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
