'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  Time,
  ColorType,
  CrosshairMode,
  LineStyle,
  DeepPartial,
  ChartOptions,
  SeriesOptionsCommon,
} from 'lightweight-charts';
import { useTheme } from 'next-themes';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
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

interface TradingViewChartProps {
  candles: Candle[];
  indicators?: IndicatorData;
  visibleIndicators?: Set<string>;
  height?: number;
}

function toChartTime(ts: number): Time {
  return Math.floor(ts / 1000) as Time;
}

function buildLineData(candles: Candle[], values: number[]): LineData<Time>[] {
  const result: LineData<Time>[] = [];
  const offset = candles.length - values.length;
  for (let i = 0; i < values.length; i++) {
    const ci = offset + i;
    if (ci >= 0 && ci < candles.length && values[i] != null && !isNaN(values[i])) {
      result.push({ time: toChartTime(candles[ci].time), value: values[i] });
    }
  }
  return result;
}

const INDICATOR_COLORS: Record<string, string> = {
  sma: '#eab308',
  ema: '#3b82f6',
  vwma: '#f97316',
  bbUpper: '#a855f7',
  bbMiddle: '#a855f7',
  bbLower: '#a855f7',
  supertrendUp: '#22c55e',
  supertrendDown: '#ef4444',
  sar: '#06b6d4',
  donchianUpper: '#14b8a6',
  donchianLower: '#14b8a6',
  keltnerUpper: '#f59e0b',
  keltnerLower: '#f59e0b',
  rsi: '#eab308',
  macdLine: '#3b82f6',
  macdSignal: '#f97316',
  macdHist: '#94a3b8',
  stochK: '#3b82f6',
  stochD: '#f97316',
  adx: '#eab308',
  plusDI: '#22c55e',
  minusDI: '#ef4444',
  obv: '#8b5cf6',
  cci: '#06b6d4',
  mfi: '#a855f7',
};

export default function TradingViewChart({
  candles,
  indicators = {},
  visibleIndicators = new Set(),
  height = 500,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const chartOptions = useMemo<DeepPartial<ChartOptions>>(
    () => ({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0f172a' : '#ffffff' },
        textColor: isDark ? '#e2e8f0' : '#1e293b',
      },
      grid: {
        vertLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
        horzLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: isDark ? '#475569' : '#94a3b8', width: 1, style: LineStyle.Dashed },
        horzLine: { color: isDark ? '#475569' : '#94a3b8', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: isDark ? '#334155' : '#e2e8f0',
      },
      timeScale: {
        borderColor: isDark ? '#334155' : '#e2e8f0',
        timeVisible: false,
      },
      width: chartContainerRef.current?.clientWidth || 800,
      height,
    }),
    [isDark, height]
  );

  const addSeries = useCallback(
    (key: string, addFn: () => ISeriesApi<any>, data: any[]) => {
      if (!chartRef.current || data.length === 0) return;
      if (!visibleIndicators.has(key) && !['candlestick', 'volume'].includes(key)) return;

      const series = addFn();
      series.setData(data as any);
      seriesRefs.current.set(key, series);
    },
    [visibleIndicators]
  );

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;
    seriesRefs.current.clear();

    // Candlestick
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    const candleData: CandlestickData<Time>[] = candles.map((c) => ({
      time: toChartTime(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candlestickSeries.setData(candleData);
    seriesRefs.current.set('candlestick', candlestickSeries);

    // Volume
    const volumeSeries = chart.addHistogramSeries({
      color: '#64748b',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    const volumeData: HistogramData<Time>[] = candles.map((c) => ({
      time: toChartTime(c.time),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
    }));
    volumeSeries.setData(volumeData);
    seriesRefs.current.set('volume', volumeSeries);

    // Overlay indicators on main pane
    // SMA
    if (indicators.sma && visibleIndicators.has('sma')) {
      const s = chart.addLineSeries({ color: INDICATOR_COLORS.sma, lineWidth: 1, title: 'SMA' });
      s.setData(buildLineData(candles, indicators.sma.values));
      seriesRefs.current.set('sma', s);
    }
    // EMA
    if (indicators.ema && visibleIndicators.has('ema')) {
      const s = chart.addLineSeries({ color: INDICATOR_COLORS.ema, lineWidth: 1, title: 'EMA' });
      s.setData(buildLineData(candles, indicators.ema.values));
      seriesRefs.current.set('ema', s);
    }

    // Bollinger Bands
    if (indicators.bollingerBands && visibleIndicators.has('bollingerBands')) {
      const bbValues = indicators.bollingerBands.values;
      const upperVals = bbValues.map((v) => v.upper);
      const middleVals = bbValues.map((v) => v.middle);
      const lowerVals = bbValues.map((v) => v.lower);
      const upper = chart.addLineSeries({ color: INDICATOR_COLORS.bbUpper, lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'BB\u2191' });
      upper.setData(buildLineData(candles, upperVals));
      const middle = chart.addLineSeries({ color: INDICATOR_COLORS.bbMiddle, lineWidth: 1, title: 'BB' });
      middle.setData(buildLineData(candles, middleVals));
      const lower = chart.addLineSeries({ color: INDICATOR_COLORS.bbLower, lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'BB\u2193' });
      lower.setData(buildLineData(candles, lowerVals));
    }

    // Supertrend
    if (indicators.supertrend && visibleIndicators.has('supertrend')) {
      const stValues = indicators.supertrend.values;
      const upData: LineData<Time>[] = [];
      const downData: LineData<Time>[] = [];
      const offset = candles.length - stValues.length;
      for (let i = 0; i < stValues.length; i++) {
        const ci = offset + i;
        if (ci >= 0 && ci < candles.length) {
          const d = { time: toChartTime(candles[ci].time), value: stValues[i].value };
          if (stValues[i].trend === 'up') upData.push(d);
          else downData.push(d);
        }
      }
      if (upData.length > 0) {
        const s = chart.addLineSeries({ color: INDICATOR_COLORS.supertrendUp, lineWidth: 2, title: 'ST\u2191' });
        s.setData(upData);
      }
      if (downData.length > 0) {
        const s = chart.addLineSeries({ color: INDICATOR_COLORS.supertrendDown, lineWidth: 2, title: 'ST\u2193' });
        s.setData(downData);
      }
    }

    // Donchian Channel
    if (indicators.donchianChannel && visibleIndicators.has('donchianChannel')) {
      const dcValues = indicators.donchianChannel.values;
      const upperVals = dcValues.map((v) => v.upper);
      const lowerVals = dcValues.map((v) => v.lower);
      const upper = chart.addLineSeries({ color: INDICATOR_COLORS.donchianUpper, lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'DC\u2191' });
      upper.setData(buildLineData(candles, upperVals));
      const lower = chart.addLineSeries({ color: INDICATOR_COLORS.donchianLower, lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'DC\u2193' });
      lower.setData(buildLineData(candles, lowerVals));
    }

    // Keltner Channel
    if (indicators.keltnerChannel && visibleIndicators.has('keltnerChannel')) {
      const kcValues = indicators.keltnerChannel.values;
      const upperVals = kcValues.map((v) => v.upper);
      const lowerVals = kcValues.map((v) => v.lower);
      const upper = chart.addLineSeries({ color: INDICATOR_COLORS.keltnerUpper, lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'KC\u2191' });
      upper.setData(buildLineData(candles, upperVals));
      const lower = chart.addLineSeries({ color: INDICATOR_COLORS.keltnerLower, lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'KC\u2193' });
      lower.setData(buildLineData(candles, lowerVals));
    }

    // Separate pane indicators
    // RSI
    if (indicators.rsi && visibleIndicators.has('rsi')) {
      const rsiScale = 'rsi';
      const rsiSeries = chart.addLineSeries({
        color: INDICATOR_COLORS.rsi,
        lineWidth: 2,
        title: 'RSI',
        priceScaleId: rsiScale,
      });
      chart.priceScale(rsiScale).applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      rsiSeries.setData(buildLineData(candles, indicators.rsi.values));
      // Overbought/Oversold lines
      const ob: LineData<Time>[] = [];
      const os: LineData<Time>[] = [];
      const rsiLen = indicators.rsi.values.length;
      const rsiOff = candles.length - rsiLen;
      for (let i = 0; i < rsiLen; i++) {
        const ci = rsiOff + i;
        if (ci >= 0 && ci < candles.length) {
          ob.push({ time: toChartTime(candles[ci].time), value: 70 });
          os.push({ time: toChartTime(candles[ci].time), value: 30 });
        }
      }
      const obLine = chart.addLineSeries({ color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed, priceScaleId: rsiScale });
      obLine.setData(ob);
      const osLine = chart.addLineSeries({ color: '#22c55e', lineWidth: 1, lineStyle: LineStyle.Dashed, priceScaleId: rsiScale });
      osLine.setData(os);
    }

    // MACD
    if (indicators.macd && visibleIndicators.has('macd')) {
      const macdScale = 'macd';
      const macdValues = indicators.macd.values;
      const macdLineVals = macdValues.map((v) => v.macdLine);
      const signalLineVals = macdValues.map((v) => v.signalLine);
      const histogramVals = macdValues.map((v) => v.histogram);

      const macdLine = chart.addLineSeries({
        color: INDICATOR_COLORS.macdLine,
        lineWidth: 2,
        title: 'MACD',
        priceScaleId: macdScale,
      });
      chart.priceScale(macdScale).applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });
      macdLine.setData(buildLineData(candles, macdLineVals));

      const signalLine = chart.addLineSeries({
        color: INDICATOR_COLORS.macdSignal,
        lineWidth: 1,
        title: 'Signal',
        priceScaleId: macdScale,
      });
      signalLine.setData(buildLineData(candles, signalLineVals));

      const histData: HistogramData<Time>[] = [];
      const offset = candles.length - histogramVals.length;
      for (let i = 0; i < histogramVals.length; i++) {
        const ci = offset + i;
        if (ci >= 0 && ci < candles.length) {
          histData.push({
            time: toChartTime(candles[ci].time),
            value: histogramVals[i],
            color: histogramVals[i] >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
          });
        }
      }
      const histSeries = chart.addHistogramSeries({
        color: INDICATOR_COLORS.macdHist,
        priceScaleId: macdScale,
        title: 'Hist',
      });
      histSeries.setData(histData);
    }

    // Stochastic
    if (indicators.stochastic && visibleIndicators.has('stochastic')) {
      const scale = 'stoch';
      const stochValues = indicators.stochastic.values;
      const kVals = stochValues.map((v) => v.k);
      const dVals = stochValues.map((v) => v.d);
      const kLine = chart.addLineSeries({ color: INDICATOR_COLORS.stochK, lineWidth: 2, title: '%K', priceScaleId: scale });
      chart.priceScale(scale).applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });
      kLine.setData(buildLineData(candles, kVals));
      const dLine = chart.addLineSeries({ color: INDICATOR_COLORS.stochD, lineWidth: 1, title: '%D', priceScaleId: scale });
      dLine.setData(buildLineData(candles, dVals));
    }

    // ADX
    if (indicators.adx && visibleIndicators.has('adx')) {
      const scale = 'adx';
      const adxValues = indicators.adx.values;
      const adxVals = adxValues.map((v) => v.adx);
      const plusDIVals = adxValues.map((v) => v.plusDI);
      const minusDIVals = adxValues.map((v) => v.minusDI);
      const adxLine = chart.addLineSeries({ color: INDICATOR_COLORS.adx, lineWidth: 2, title: 'ADX', priceScaleId: scale });
      chart.priceScale(scale).applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });
      adxLine.setData(buildLineData(candles, adxVals));
      const plusDI = chart.addLineSeries({ color: INDICATOR_COLORS.plusDI, lineWidth: 1, title: '+DI', priceScaleId: scale });
      plusDI.setData(buildLineData(candles, plusDIVals));
      const minusDI = chart.addLineSeries({ color: INDICATOR_COLORS.minusDI, lineWidth: 1, title: '-DI', priceScaleId: scale });
      minusDI.setData(buildLineData(candles, minusDIVals));
    }

    // OBV
    if (indicators.obv && visibleIndicators.has('obv')) {
      const scale = 'obv';
      const obvLine = chart.addLineSeries({ color: INDICATOR_COLORS.obv, lineWidth: 2, title: 'OBV', priceScaleId: scale });
      chart.priceScale(scale).applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });
      obvLine.setData(buildLineData(candles, indicators.obv.values));
    }

    // CCI
    if (indicators.cci && visibleIndicators.has('cci')) {
      const scale = 'cci';
      const cciLine = chart.addLineSeries({ color: INDICATOR_COLORS.cci, lineWidth: 2, title: 'CCI', priceScaleId: scale });
      chart.priceScale(scale).applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });
      cciLine.setData(buildLineData(candles, indicators.cci.values));
    }

    // MFI
    if (indicators.mfi && visibleIndicators.has('mfi')) {
      const scale = 'mfi';
      const mfiLine = chart.addLineSeries({ color: INDICATOR_COLORS.mfi, lineWidth: 2, title: 'MFI', priceScaleId: scale });
      chart.priceScale(scale).applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });
      mfiLine.setData(buildLineData(candles, indicators.mfi.values));
    }

    chart.timeScale().fitContent();

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRefs.current.clear();
    };
  }, [candles, indicators, visibleIndicators, chartOptions]);

  return (
    <div className="relative w-full">
      <div ref={chartContainerRef} className="w-full" style={{ height }} />
    </div>
  );
}
