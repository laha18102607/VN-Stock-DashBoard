import type { OHLCCandle } from './types';

// ─────────────────────────────────────────────────────────────
// Simple Moving Average (SMA)
// ─────────────────────────────────────────────────────────────

export function sma(closes: number[], period: number): number[] {
  if (closes.length < period) return [];
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closes[i];
  }
  result.push(sum / period);
  for (let i = period; i < closes.length; i++) {
    sum += closes[i] - closes[i - period];
    result.push(sum / period);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Exponential Moving Average (EMA)
// ─────────────────────────────────────────────────────────────

export function ema(closes: number[], period: number): number[] {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closes[i];
  }
  result.push(sum / period);

  for (let i = period; i < closes.length; i++) {
    const val = closes[i] * k + result[result.length - 1] * (1 - k);
    result.push(val);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Volume Weighted Moving Average (VWMA)
// ─────────────────────────────────────────────────────────────

export function vwma(
  closes: number[],
  volumes: number[],
  period: number,
): number[] {
  if (closes.length < period || volumes.length < period) return [];
  const result: number[] = [];

  for (let i = period - 1; i < closes.length; i++) {
    let pvSum = 0;
    let vSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      pvSum += closes[j] * volumes[j];
      vSum += volumes[j];
    }
    result.push(vSum !== 0 ? pvSum / vSum : 0);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Relative Strength Index (RSI)
// ─────────────────────────────────────────────────────────────

export function rsi(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return [];

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  const result: number[] = [];
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const r = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + r));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// MACD
// ─────────────────────────────────────────────────────────────

export interface MACDPoint {
  macdLine: number;
  signalLine: number;
  histogram: number;
}

export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): MACDPoint[] {
  if (closes.length < slow + signal) return [];

  const fastEMA = ema(closes, fast);
  const slowEMA = ema(closes, slow);

  // Align arrays: fastEMA starts at index (fast-1), slowEMA at (slow-1)
  const offset = slow - fast;
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }

  const signalLine = ema(macdLine, signal);
  const result: MACDPoint[] = [];
  const sigOffset = signal - 1;

  for (let i = 0; i < signalLine.length; i++) {
    const ml = macdLine[i + sigOffset];
    const sl = signalLine[i];
    result.push({
      macdLine: ml,
      signalLine: sl,
      histogram: ml - sl,
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Bollinger Bands
// ─────────────────────────────────────────────────────────────

export interface BollingerBandPoint {
  upper: number;
  middle: number;
  lower: number;
}

export function bollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2,
): BollingerBandPoint[] {
  if (closes.length < period) return [];
  const result: BollingerBandPoint[] = [];

  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += closes[j];
    }
    const middle = sum / period;

    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sqSum += (closes[j] - middle) ** 2;
    }
    const std = Math.sqrt(sqSum / period);

    result.push({
      upper: middle + stdDev * std,
      middle,
      lower: middle - stdDev * std,
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Average True Range (ATR)
// ─────────────────────────────────────────────────────────────

export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number[] {
  if (closes.length < period + 1) return [];

  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }

  // Initial ATR = average of first `period` TR values
  let atrVal = 0;
  for (let i = 0; i < period; i++) {
    atrVal += tr[i];
  }
  atrVal /= period;

  const result: number[] = [atrVal];
  for (let i = period; i < tr.length; i++) {
    atrVal = (atrVal * (period - 1) + tr[i]) / period;
    result.push(atrVal);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Average Directional Index (ADX)
// ─────────────────────────────────────────────────────────────

export interface ADXPoint {
  adx: number;
  plusDI: number;
  minusDI: number;
}

export function adx(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): ADXPoint[] {
  if (closes.length < period * 2 + 1) return [];

  const n = closes.length;

  // Calculate +DM, -DM, TR
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }

  // Smoothed TR, +DM, -DM using Wilder's smoothing
  const smoothTR: number[] = [];
  const smoothPlusDM: number[] = [];
  const smoothMinusDM: number[] = [];

  let sTR = 0,
    sPDM = 0,
    sMDM = 0;
  for (let i = 0; i < period; i++) {
    sTR += tr[i];
    sPDM += plusDM[i];
    sMDM += minusDM[i];
  }
  smoothTR.push(sTR);
  smoothPlusDM.push(sPDM);
  smoothMinusDM.push(sMDM);

  for (let i = period; i < tr.length; i++) {
    sTR = sTR - sTR / period + tr[i];
    sPDM = sPDM - sPDM / period + plusDM[i];
    sMDM = sMDM - sMDM / period + minusDM[i];
    smoothTR.push(sTR);
    smoothPlusDM.push(sPDM);
    smoothMinusDM.push(sMDM);
  }

  // +DI, -DI, DX
  const dx: number[] = [];
  const plusDI: number[] = [];
  const minusDI: number[] = [];

  for (let i = 0; i < smoothTR.length; i++) {
    const pdi = smoothTR[i] !== 0 ? (smoothPlusDM[i] / smoothTR[i]) * 100 : 0;
    const mdi = smoothTR[i] !== 0 ? (smoothMinusDM[i] / smoothTR[i]) * 100 : 0;
    const diSum = pdi + mdi;
    const dxVal = diSum !== 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0;

    plusDI.push(pdi);
    minusDI.push(mdi);
    dx.push(dxVal);
  }

  // ADX = smoothed DX over `period`
  let adxSum = 0;
  for (let i = 0; i < period && i < dx.length; i++) {
    adxSum += dx[i];
  }
  let adxVal = adxSum / period;

  const result: ADXPoint[] = [];
  result.push({
    adx: adxVal,
    plusDI: plusDI[period - 1] ?? 0,
    minusDI: minusDI[period - 1] ?? 0,
  });

  for (let i = period; i < dx.length; i++) {
    adxVal = (adxVal * (period - 1) + dx[i]) / period;
    result.push({
      adx: adxVal,
      plusDI: plusDI[i],
      minusDI: minusDI[i],
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// On-Balance Volume (OBV)
// ─────────────────────────────────────────────────────────────

export function obv(closes: number[], volumes: number[]): number[] {
  if (closes.length === 0) return [];
  const result: number[] = [0];

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      result.push(result[i - 1] + volumes[i]);
    } else if (closes[i] < closes[i - 1]) {
      result.push(result[i - 1] - volumes[i]);
    } else {
      result.push(result[i - 1]);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Stochastic Oscillator
// ─────────────────────────────────────────────────────────────

export interface StochasticPoint {
  k: number;
  d: number;
}

export function stochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3,
): StochasticPoint[] {
  if (closes.length < kPeriod + dPeriod - 1) return [];

  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < closes.length; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, highs[j]);
      ll = Math.min(ll, lows[j]);
    }
    const range = hh - ll;
    const k = range !== 0 ? ((closes[i] - ll) / range) * 100 : 50;
    kValues.push(k);
  }

  const result: StochasticPoint[] = [];
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    let kSum = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) {
      kSum += kValues[j];
    }
    result.push({
      k: kValues[i],
      d: kSum / dPeriod,
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Commodity Channel Index (CCI)
// ─────────────────────────────────────────────────────────────

export function cci(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 20,
): number[] {
  if (closes.length < period) return [];

  const tp: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    tp.push((highs[i] + lows[i] + closes[i]) / 3);
  }

  const result: number[] = [];
  for (let i = period - 1; i < tp.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += tp[j];
    }
    const mean = sum / period;

    let madSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      madSum += Math.abs(tp[j] - mean);
    }
    const meanDeviation = madSum / period;

    const cciVal = meanDeviation !== 0 ? (tp[i] - mean) / (0.015 * meanDeviation) : 0;
    result.push(cciVal);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Ichimoku Cloud
// ─────────────────────────────────────────────────────────────

export interface IchimokuPoint {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
  chikou: number;
}

function midHighLow(highs: number[], lows: number[], start: number, length: number): number {
  let hh = -Infinity;
  let ll = Infinity;
  for (let i = start; i < start + length && i < highs.length; i++) {
    hh = Math.max(hh, highs[i]);
    ll = Math.min(ll, lows[i]);
  }
  return (hh + ll) / 2;
}

export function ichimoku(
  highs: number[],
  lows: number[],
  closes: number[],
): IchimokuPoint[] {
  const tenkanPeriod = 9;
  const kijunPeriod = 26;
  const senkouBPeriod = 52;
  const displacement = 26;

  if (closes.length < senkouBPeriod + displacement) return [];

  const result: IchimokuPoint[] = [];
  const startIdx = senkouBPeriod - 1;

  for (let i = startIdx; i < closes.length; i++) {
    const tenkanStart = i - tenkanPeriod + 1;
    const kijunStart = i - kijunPeriod + 1;
    const senkouBStart = i - senkouBPeriod + 1;

    const tenkan = midHighLow(highs, lows, Math.max(0, tenkanStart), tenkanPeriod);
    const kijun = midHighLow(highs, lows, Math.max(0, kijunStart), kijunPeriod);
    const senkouA = (tenkan + kijun) / 2;

    // Senkou B: midpoint of the 52-period high-low
    const senkouB = midHighLow(highs, lows, Math.max(0, senkouBStart), senkouBPeriod);

    // Chikou: current close shifted back 26 periods
    const chikouIdx = i - displacement;
    const chikou = chikouIdx >= 0 ? closes[chikouIdx] : closes[i];

    result.push({ tenkan, kijun, senkouA, senkouB, chikou });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Parabolic SAR
// ─────────────────────────────────────────────────────────────

export interface ParabolicSARPoint {
  sar: number;
  trend: 'up' | 'down';
}

export function parabolicSAR(
  highs: number[],
  lows: number[],
  af = 0.02,
  maxAf = 0.2,
): ParabolicSARPoint[] {
  if (highs.length < 2) return [];

  const result: ParabolicSARPoint[] = [];
  let trend: 'up' | 'down' = 'up';
  let sar = lows[0];
  let ep = highs[0];
  let currentAf = af;

  result.push({ sar, trend });

  for (let i = 1; i < highs.length; i++) {
    // Calculate SAR
    sar = sar + currentAf * (ep - sar);

    if (trend === 'up') {
      // SAR should not be above the two previous lows
      if (i >= 2) sar = Math.min(sar, lows[i - 1], lows[i - 2]);
      else if (i >= 1) sar = Math.min(sar, lows[i - 1]);

      if (lows[i] < sar) {
        // Reverse to downtrend
        trend = 'down';
        sar = ep;
        ep = lows[i];
        currentAf = af;
      } else {
        if (highs[i] > ep) {
          ep = highs[i];
          currentAf = Math.min(currentAf + af, maxAf);
        }
      }
    } else {
      // SAR should not be below the two previous highs
      if (i >= 2) sar = Math.max(sar, highs[i - 1], highs[i - 2]);
      else if (i >= 1) sar = Math.max(sar, highs[i - 1]);

      if (highs[i] > sar) {
        // Reverse to uptrend
        trend = 'up';
        sar = ep;
        ep = highs[i];
        currentAf = af;
      } else {
        if (lows[i] < ep) {
          ep = lows[i];
          currentAf = Math.min(currentAf + af, maxAf);
        }
      }
    }

    result.push({ sar, trend });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Supertrend
// ─────────────────────────────────────────────────────────────

export interface SupertrendPoint {
  value: number;
  trend: 'up' | 'down';
}

export function supertrend(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 10,
  multiplier = 3,
): SupertrendPoint[] {
  if (closes.length < period + 1) return [];

  const atrValues = atr(highs, lows, closes, period);
  const result: SupertrendPoint[] = [];

  // Align: ATR starts at index `period` relative to closes
  // supertrend result starts at same index as ATR (index `period` in original data)
  let upperBand = 0;
  let lowerBand = 0;
  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevSupertrend = 0;
  let prevClose = closes[period - 1];

  for (let i = 0; i < atrValues.length; i++) {
    const closeIdx = i + period;
    const hl2 = (highs[closeIdx] + lows[closeIdx]) / 2;
    const basicUpper = hl2 + multiplier * atrValues[i];
    const basicLower = hl2 - multiplier * atrValues[i];

    upperBand =
      basicUpper < prevUpperBand || closes[closeIdx - 1] > prevUpperBand
        ? basicUpper
        : prevUpperBand;

    lowerBand =
      basicLower > prevLowerBand || closes[closeIdx - 1] < prevLowerBand
        ? basicLower
        : prevLowerBand;

    let st: number;
    let t: 'up' | 'down';

    if (prevSupertrend === prevUpperBand) {
      st = closes[closeIdx] > upperBand ? lowerBand : upperBand;
    } else {
      st = closes[closeIdx] < lowerBand ? upperBand : lowerBand;
    }

    t = st === lowerBand ? 'up' : 'down';

    result.push({ value: st, trend: t });

    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevSupertrend = st;
    prevClose = closes[closeIdx];
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Pivot Points
// ─────────────────────────────────────────────────────────────

export interface PivotPointsResult {
  pp: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export function pivotPoints(high: number, low: number, close: number): PivotPointsResult {
  const pp = (high + low + close) / 3;
  return {
    pp,
    r1: 2 * pp - low,
    s1: 2 * pp - high,
    r2: pp + (high - low),
    s2: pp - (high - low),
    r3: high + 2 * (pp - low),
    s3: low - 2 * (high - pp),
  };
}

// ─────────────────────────────────────────────────────────────
// Fibonacci Retracement
// ─────────────────────────────────────────────────────────────

export interface FibonacciLevel {
  level: number;
  price: number;
  label: string;
}

export function fibonacci(high: number, low: number): FibonacciLevel[] {
  const diff = high - low;
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const labels = ['0%', '23.6%', '38.2%', '50%', '61.8%', '78.6%', '100%'];

  return levels.map((level, i) => ({
    level,
    price: high - diff * level,
    label: labels[i],
  }));
}

// ─────────────────────────────────────────────────────────────
// Donchian Channel
// ─────────────────────────────────────────────────────────────

export interface DonchianChannelPoint {
  upper: number;
  middle: number;
  lower: number;
}

export function donchianChannel(
  highs: number[],
  lows: number[],
  period = 20,
): DonchianChannelPoint[] {
  if (highs.length < period) return [];
  const result: DonchianChannelPoint[] = [];

  for (let i = period - 1; i < highs.length; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, highs[j]);
      ll = Math.min(ll, lows[j]);
    }
    result.push({
      upper: hh,
      middle: (hh + ll) / 2,
      lower: ll,
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Keltner Channel
// ─────────────────────────────────────────────────────────────

export interface KeltnerChannelPoint {
  upper: number;
  middle: number;
  lower: number;
}

export function keltnerChannel(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 20,
  atrMultiplier = 2,
): KeltnerChannelPoint[] {
  if (closes.length < period + 1) return [];

  const middleLine = ema(closes, period);
  const atrValues = atr(highs, lows, closes, period);

  const result: KeltnerChannelPoint[] = [];
  // Align: ema starts at closes[period-1], atr starts at closes[period]
  // Use min length
  const minLen = Math.min(middleLine.length, atrValues.length);
  const emaOffset = middleLine.length - minLen;
  const atrOffset = atrValues.length - minLen;

  for (let i = 0; i < minLen; i++) {
    const mid = middleLine[i + emaOffset];
    const atrVal = atrValues[i + atrOffset];
    result.push({
      upper: mid + atrMultiplier * atrVal,
      middle: mid,
      lower: mid - atrMultiplier * atrVal,
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Money Flow Index (MFI)
// ─────────────────────────────────────────────────────────────

export function mfi(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period = 14,
): number[] {
  if (closes.length < period + 1) return [];

  const tp: number[] = [];
  const mf: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    tp.push((highs[i] + lows[i] + closes[i]) / 3);
    mf.push(tp[i] * volumes[i]);
  }

  const result: number[] = [];
  for (let i = period; i < closes.length; i++) {
    let posFlow = 0;
    let negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) {
        posFlow += mf[j];
      } else {
        negFlow += mf[j];
      }
    }
    const mfr = negFlow !== 0 ? posFlow / negFlow : 100;
    result.push(100 - 100 / (1 + mfr));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Volume Profile
// ─────────────────────────────────────────────────────────────

export interface VolumeProfileBin {
  price: number;
  volume: number;
}

export function volumeProfile(
  candles: OHLCCandle[],
  numBins = 20,
): VolumeProfileBin[] {
  if (candles.length === 0) return [];

  let globalHigh = -Infinity;
  let globalLow = Infinity;
  for (const c of candles) {
    globalHigh = Math.max(globalHigh, c.high);
    globalLow = Math.min(globalLow, c.low);
  }

  const range = globalHigh - globalLow;
  if (range === 0) {
    return [{ price: globalHigh, volume: candles.reduce((s, c) => s + c.volume, 0) }];
  }

  const binSize = range / numBins;
  const bins: VolumeProfileBin[] = [];

  for (let i = 0; i < numBins; i++) {
    bins.push({
      price: globalLow + binSize * (i + 0.5),
      volume: 0,
    });
  }

  for (const c of candles) {
    const avgPrice = (c.high + c.low + c.close) / 3;
    const binIdx = Math.min(Math.floor((avgPrice - globalLow) / binSize), numBins - 1);
    bins[Math.max(0, binIdx)].volume += c.volume;
  }

  return bins;
}

// ─────────────────────────────────────────────────────────────
// Run All Indicators
// ─────────────────────────────────────────────────────────────

export function runAllIndicators(candles: OHLCCandle[]) {
  if (candles.length === 0) return null;

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  const lastCandle = candles[candles.length - 1];

  return {
    sma: { name: 'SMA' as const, values: sma(closes, 20), period: 20 },
    ema: { name: 'EMA' as const, values: ema(closes, 20), period: 20 },
    vwma: { name: 'VWMA' as const, values: vwma(closes, volumes, 20), period: 20 },
    rsi: { name: 'RSI' as const, values: rsi(closes, 14), period: 14 },
    macd: {
      name: 'MACD' as const,
      values: macd(closes, 12, 26, 9),
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
    bollingerBands: {
      name: 'BollingerBands' as const,
      values: bollingerBands(closes, 20, 2),
      period: 20,
      stdDev: 2,
    },
    atr: { name: 'ATR' as const, values: atr(highs, lows, closes, 14), period: 14 },
    adx: { name: 'ADX' as const, values: adx(highs, lows, closes, 14), period: 14 },
    obv: { name: 'OBV' as const, values: obv(closes, volumes) },
    stochastic: {
      name: 'Stochastic' as const,
      values: stochastic(highs, lows, closes, 14, 3),
      kPeriod: 14,
      dPeriod: 3,
    },
    cci: { name: 'CCI' as const, values: cci(highs, lows, closes, 20), period: 20 },
    ichimoku: { name: 'Ichimoku' as const, values: ichimoku(highs, lows, closes) },
    parabolicSAR: {
      name: 'ParabolicSAR' as const,
      values: parabolicSAR(highs, lows, 0.02, 0.2),
      af: 0.02,
      maxAf: 0.2,
    },
    supertrend: {
      name: 'Supertrend' as const,
      values: supertrend(highs, lows, closes, 10, 3),
      period: 10,
      multiplier: 3,
    },
    pivotPoints: {
      name: 'PivotPoints' as const,
      ...pivotPoints(lastCandle.high, lastCandle.low, lastCandle.close),
    },
    fibonacci: {
      name: 'Fibonacci' as const,
      values: fibonacci(Math.max(...highs.slice(-60)), Math.min(...lows.slice(-60))),
    },
    donchianChannel: {
      name: 'DonchianChannel' as const,
      values: donchianChannel(highs, lows, 20),
      period: 20,
    },
    keltnerChannel: {
      name: 'KeltnerChannel' as const,
      values: keltnerChannel(highs, lows, closes, 20, 2),
      period: 20,
      atrMultiplier: 2,
    },
    mfi: { name: 'MFI' as const, values: mfi(highs, lows, closes, volumes, 14), period: 14 },
    volumeProfile: {
      name: 'VolumeProfile' as const,
      values: volumeProfile(candles, 20),
      numBins: 20,
    },
  };
}
