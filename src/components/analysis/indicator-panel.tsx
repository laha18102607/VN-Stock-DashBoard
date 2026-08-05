"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface IndicatorPanelProps {
  indicators: any;
  latestIndex: number;
}

type SignalDirection = "Bullish" | "Bearish" | "Neutral";

interface IndicatorItem {
  name: string;
  value: string;
  signal: SignalDirection;
  explanation: string;
}

function getSignalBadge(signal: SignalDirection) {
  switch (signal) {
    case "Bullish":
      return <Badge variant="success" className="text-[10px] px-1.5">Bullish</Badge>;
    case "Bearish":
      return <Badge variant="destructive" className="text-[10px] px-1.5">Bearish</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">Neutral</Badge>;
  }
}

function getSignalFromTrend(trend: "up" | "down" | undefined): SignalDirection {
  if (trend === "up") return "Bullish";
  if (trend === "down") return "Bearish";
  return "Neutral";
}

function getRSISignal(rsi: number): { signal: SignalDirection; label: string } {
  if (rsi >= 70) return { signal: "Bearish", label: "Overbought" };
  if (rsi <= 30) return { signal: "Bullish", label: "Oversold" };
  if (rsi >= 60) return { signal: "Bullish", label: "Strong" };
  if (rsi <= 40) return { signal: "Bearish", label: "Weak" };
  return { signal: "Neutral", label: "Normal" };
}

function getMACDSignal(macdLine: number, signalLine: number, histogram: number): SignalDirection {
  if (macdLine > signalLine && histogram > 0) return "Bullish";
  if (macdLine < signalLine && histogram < 0) return "Bearish";
  return "Neutral";
}

function getStochasticSignal(k: number, d: number): SignalDirection {
  if (k < 20 && d < 20) return "Bullish";
  if (k > 80 && d > 80) return "Bearish";
  if (k > d) return "Bullish";
  if (k < d) return "Bearish";
  return "Neutral";
}

function getCCISignal(cci: number): SignalDirection {
  if (cci > 100) return "Bullish";
  if (cci < -100) return "Bearish";
  return "Neutral";
}

function getMFISignal(mfi: number): SignalDirection {
  if (mfi >= 80) return "Bearish";
  if (mfi <= 20) return "Bullish";
  return "Neutral";
}

function extractIndicators(indicators: any, idx: number): {
  trend: IndicatorItem[];
  momentum: IndicatorItem[];
  volatility: IndicatorItem[];
  volume: IndicatorItem[];
} {
  const trend: IndicatorItem[] = [];
  const momentum: IndicatorItem[] = [];
  const volatility: IndicatorItem[] = [];
  const volume: IndicatorItem[] = [];

  // --- Trend ---
  if (indicators?.sma?.values?.[idx] != null) {
    const val = indicators.sma.values[idx];
    const period = indicators.sma.period;
    trend.push({
      name: `SMA(${period})`,
      value: val.toFixed(2),
      signal: "Neutral",
      explanation: `Simple Moving Average over ${period} periods`,
    });
  }

  if (indicators?.ema?.values?.[idx] != null) {
    const val = indicators.ema.values[idx];
    const period = indicators.ema.period;
    trend.push({
      name: `EMA(${period})`,
      value: val.toFixed(2),
      signal: "Neutral",
      explanation: `Exponential Moving Average over ${period} periods`,
    });
  }

  if (indicators?.supertrend?.values?.[idx]) {
    const st = indicators.supertrend.values[idx];
    const trendDir = getSignalFromTrend(st.trend);
    trend.push({
      name: "Supertrend",
      value: st.value?.toFixed(2) ?? "---",
      signal: trendDir,
      explanation: st.trend === "up" ? "Price above supertrend line, uptrend confirmed" : "Price below supertrend line, downtrend confirmed",
    });
  }

  if (indicators?.ichimoku?.values?.[idx]) {
    const ich = indicators.ichimoku.values[idx];
    const isAboveCloud = ich.tenkan > ich.kijun;
    trend.push({
      name: "Ichimoku Cloud",
      value: `T: ${ich.tenkan?.toFixed(2) ?? "---"} / K: ${ich.kijun?.toFixed(2) ?? "---"}`,
      signal: isAboveCloud ? "Bullish" : "Bearish",
      explanation: isAboveCloud
        ? "Tenkan above Kijun, bullish cloud formation"
        : "Tenkan below Kijun, bearish cloud formation",
    });
  }

  // --- Momentum ---
  if (indicators?.rsi?.values?.[idx] != null) {
    const rsiVal = indicators.rsi.values[idx];
    const rsiInfo = getRSISignal(rsiVal);
    momentum.push({
      name: "RSI",
      value: `${rsiVal.toFixed(1)} (${rsiInfo.label})`,
      signal: rsiInfo.signal,
      explanation: rsiVal >= 70
        ? "Overbought territory, potential reversal downward"
        : rsiVal <= 30
        ? "Oversold territory, potential reversal upward"
        : "Within normal trading range",
    });
  }

  if (indicators?.macd?.values?.[idx]) {
    const macd = indicators.macd.values[idx];
    const sig = getMACDSignal(macd.macdLine, macd.signalLine, macd.histogram);
    momentum.push({
      name: "MACD",
      value: `${macd.macdLine?.toFixed(2) ?? "---"} / ${macd.signalLine?.toFixed(2) ?? "---"}`,
      signal: sig,
      explanation: macd.histogram > 0
        ? "Bullish momentum, histogram expanding"
        : "Bearish momentum, histogram contracting",
    });
  }

  if (indicators?.stochastic?.values?.[idx]) {
    const stoch = indicators.stochastic.values[idx];
    const stochSig = getStochasticSignal(stoch.k, stoch.d);
    momentum.push({
      name: "Stochastic",
      value: `K: ${stoch.k?.toFixed(1) ?? "---"} / D: ${stoch.d?.toFixed(1) ?? "---"}`,
      signal: stochSig,
      explanation: stoch.k < 20
        ? "Oversold zone, watch for bullish crossover"
        : stoch.k > 80
        ? "Overbought zone, watch for bearish crossover"
        : "Within normal range",
    });
  }

  if (indicators?.cci?.values?.[idx] != null) {
    const cciVal = indicators.cci.values[idx];
    momentum.push({
      name: "CCI",
      value: cciVal.toFixed(1),
      signal: getCCISignal(cciVal),
      explanation: cciVal > 100
        ? "Strong bullish momentum detected"
        : cciVal < -100
        ? "Strong bearish momentum detected"
        : "No extreme momentum",
    });
  }

  if (indicators?.mfi?.values?.[idx] != null) {
    const mfiVal = indicators.mfi.values[idx];
    momentum.push({
      name: "MFI",
      value: mfiVal.toFixed(1),
      signal: getMFISignal(mfiVal),
      explanation: mfiVal >= 80
        ? "Money flow overbought, potential reversal"
        : mfiVal <= 20
        ? "Money flow oversold, potential bounce"
        : "Normal money flow",
    });
  }

  // --- Volatility ---
  if (indicators?.bollingerBands?.values?.[idx]) {
    const bb = indicators.bollingerBands.values[idx];
    const width = bb.upper - bb.lower;
    volatility.push({
      name: "Bollinger Bands",
      value: `W: ${width?.toFixed(2) ?? "---"}`,
      signal: "Neutral",
      explanation: `Upper: ${bb.upper?.toFixed(2)} | Mid: ${bb.middle?.toFixed(2)} | Lower: ${bb.lower?.toFixed(2)}`,
    });
  }

  if (indicators?.atr?.values?.[idx] != null) {
    const atrVal = indicators.atr.values[idx];
    volatility.push({
      name: "ATR",
      value: atrVal.toFixed(2),
      signal: "Neutral",
      explanation: "Average True Range measures volatility",
    });
  }

  if (indicators?.keltnerChannel?.values?.[idx]) {
    const kc = indicators.keltnerChannel.values[idx];
    volatility.push({
      name: "Keltner Channel",
      value: `U: ${kc.upper?.toFixed(2) ?? "---"} / L: ${kc.lower?.toFixed(2) ?? "---"}`,
      signal: "Neutral",
      explanation: "ATR-based volatility channel for trend confirmation",
    });
  }

  if (indicators?.donchianChannel?.values?.[idx]) {
    const dc = indicators.donchianChannel.values[idx];
    volatility.push({
      name: "Donchian Channel",
      value: `U: ${dc.upper?.toFixed(2) ?? "---"} / L: ${dc.lower?.toFixed(2) ?? "---"}`,
      signal: "Neutral",
      explanation: "Highest high / lowest low breakout channel",
    });
  }

  // --- Volume ---
  if (indicators?.obv?.values?.[idx] != null) {
    const obvVal = indicators.obv.values[idx];
    const prevObv = idx > 0 ? indicators.obv.values[idx - 1] : obvVal;
    const obvTrend = obvVal > prevObv ? "Bullish" : obvVal < prevObv ? "Bearish" : "Neutral";
    volume.push({
      name: "OBV",
      value: (obvVal / 1e6).toFixed(2) + "M",
      signal: obvTrend as SignalDirection,
      explanation: obvTrend === "Bullish"
        ? "On-balance volume rising, accumulation"
        : obvTrend === "Bearish"
        ? "On-balance volume falling, distribution"
        : "Volume flat, no clear trend",
    });
  }

  if (indicators?.volumeProfile?.values) {
    const vp = indicators.volumeProfile.values;
    const maxVolBin = vp.reduce((max: any, bin: any) => (bin.volume > (max?.volume ?? 0) ? bin : max), vp[0]);
    volume.push({
      name: "Volume Profile",
      value: `POC: ${maxVolBin?.price?.toFixed(2) ?? "---"}`,
      signal: "Neutral",
      explanation: "Point of Control (highest volume price level)",
    });
  }

  return { trend, momentum, volatility, volume };
}

function CollapsibleSection({
  title,
  items,
  defaultOpen = true,
}: {
  title: string;
  items: IndicatorItem[];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="border-border/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {items.length}
          </Badge>
        </div>
        <svg
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="space-y-3">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-2 py-2 border-b border-border/30 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{item.name}</span>
                    {getSignalBadge(item.signal)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.explanation}</p>
                </div>
                <span className="text-sm font-mono font-semibold tabular-nums shrink-0">
                  {item.value}
                </span>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No data available
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function IndicatorPanel({ indicators, latestIndex }: IndicatorPanelProps) {
  const sections = extractIndicators(indicators, latestIndex);

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Technical Indicators</CardTitle>
          <Badge variant="outline" className="text-xs">
            Index #{latestIndex}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CollapsibleSection title="Trend" items={sections.trend} />
        <CollapsibleSection title="Momentum" items={sections.momentum} />
        <CollapsibleSection title="Volatility" items={sections.volatility} />
        <CollapsibleSection title="Volume" items={sections.volume} />
      </CardContent>
    </Card>
  );
}

export default IndicatorPanel;
