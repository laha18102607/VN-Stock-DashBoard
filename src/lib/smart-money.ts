import type {
  OHLCCandle,
  BreakOfStructure,
  ChangeOfCharacter,
  LiquiditySweep,
  OrderBlock,
  FairValueGap,
  EqualHighLow,
  PremiumDiscount,
  Mitigation,
  BreakerBlock,
  SmartMoneyResult,
  SmartMoneyDirection,
} from './types';

// ─────────────────────────────────────────────────────────────
// Helper: detect swing highs and lows
// ─────────────────────────────────────────────────────────────

interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

function detectSwings(candles: OHLCCandle[], lookback = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isSwingHigh = false;
      }
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      swings.push({ index: i, price: candles[i].high, type: 'high' });
    }
    if (isSwingLow) {
      swings.push({ index: i, price: candles[i].low, type: 'low' });
    }
  }

  return swings.sort((a, b) => a.index - b.index);
}

// ─────────────────────────────────────────────────────────────
// Break of Structure (BOS)
// ─────────────────────────────────────────────────────────────

export function detectBOS(candles: OHLCCandle[]): BreakOfStructure[] {
  if (candles.length < 10) return [];

  const swings = detectSwings(candles);
  const results: BreakOfStructure[] = [];

  for (let i = 1; i < swings.length; i++) {
    const prev = swings[i - 1];
    const curr = swings[i];

    // Look for price breaking through a previous swing point
    for (let j = prev.index + 1; j < candles.length; j++) {
      // Bullish BOS: close breaks above a previous swing high
      if (prev.type === 'high' && candles[j].close > prev.price) {
        const alreadyDetected = results.some(
          (r) => r.index === j && r.direction === 'bullish',
        );
        if (!alreadyDetected) {
          results.push({
            index: j,
            type: 'BOS',
            direction: 'bullish',
            price: prev.price,
            brokenLevel: prev.price,
            confidence: Math.min(0.95, 0.6 + (candles[j].close - prev.price) / prev.price * 20),
            explanation: `Price closed above swing high at ${prev.price.toFixed(2)} — bullish break of structure`,
          });
        }
        break;
      }

      // Bearish BOS: close breaks below a previous swing low
      if (prev.type === 'low' && candles[j].close < prev.price) {
        const alreadyDetected = results.some(
          (r) => r.index === j && r.direction === 'bearish',
        );
        if (!alreadyDetected) {
          results.push({
            index: j,
            type: 'BOS',
            direction: 'bearish',
            price: prev.price,
            brokenLevel: prev.price,
            confidence: Math.min(0.95, 0.6 + (prev.price - candles[j].close) / prev.price * 20),
            explanation: `Price closed below swing low at ${prev.price.toFixed(2)} — bearish break of structure`,
          });
        }
        break;
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Change of Character (CHoCH)
// ─────────────────────────────────────────────────────────────

export function detectCHoCH(candles: OHLCCandle[]): ChangeOfCharacter[] {
  if (candles.length < 10) return [];

  const swings = detectSwings(candles, 2);
  const results: ChangeOfCharacter[] = [];

  // Determine the prevailing trend from swing points, then detect when it reverses
  let lastTrend: SmartMoneyDirection | null = null;

  for (let i = 2; i < swings.length; i++) {
    const s0 = swings[i - 2];
    const s1 = swings[i - 1];
    const s2 = swings[i];

    // Uptrend: higher highs and higher lows
    const isUptrend =
      s0.type === 'low' &&
      s1.type === 'high' &&
      s2.type === 'low' &&
      s2.price > s0.price;

    // Downtrend: lower lows and lower highs
    const isDowntrend =
      s0.type === 'high' &&
      s1.type === 'low' &&
      s2.type === 'high' &&
      s2.price < s0.price;

    let currentTrend: SmartMoneyDirection | null = null;
    if (isUptrend) currentTrend = 'bullish';
    if (isDowntrend) currentTrend = 'bearish';

    if (currentTrend && lastTrend && currentTrend !== lastTrend) {
      const direction: SmartMoneyDirection = currentTrend;
      results.push({
        index: s2.index,
        type: 'CHoCH',
        direction,
        price: s2.price,
        previousTrend: lastTrend,
        confidence: 0.7,
        explanation: `Trend changed from ${lastTrend} to ${currentTrend} at index ${s2.index}`,
      });
    }

    if (currentTrend) lastTrend = currentTrend;
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Liquidity Sweep
// ─────────────────────────────────────────────────────────────

export function detectLiquiditySweep(candles: OHLCCandle[]): LiquiditySweep[] {
  if (candles.length < 10) return [];

  const swings = detectSwings(candles, 3);
  const results: LiquiditySweep[] = [];

  // Find equal highs or equal lows, then look for a sweep
  for (let i = 0; i < swings.length; i++) {
    const sw = swings[i];

    // Look for a candle that wicks beyond this level then closes inside
    for (let j = sw.index + 1; j < Math.min(sw.index + 10, candles.length); j++) {
      if (sw.type === 'high') {
        // Price wicked above but closed below: bearish sweep
        if (candles[j].high > sw.price && candles[j].close < sw.price) {
          results.push({
            index: j,
            type: 'LiquiditySweep',
            direction: 'bearish',
            price: sw.price,
            sweptLevel: sw.price,
            confidence: 0.75,
            explanation: `Price swept above liquidity level at ${sw.price.toFixed(2)} then closed below — bearish liquidity grab`,
          });
          break;
        }
      }

      if (sw.type === 'low') {
        // Price wicked below but closed above: bullish sweep
        if (candles[j].low < sw.price && candles[j].close > sw.price) {
          results.push({
            index: j,
            type: 'LiquiditySweep',
            direction: 'bullish',
            price: sw.price,
            sweptLevel: sw.price,
            confidence: 0.75,
            explanation: `Price swept below liquidity level at ${sw.price.toFixed(2)} then closed above — bullish liquidity grab`,
          });
          break;
        }
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Order Blocks
// ─────────────────────────────────────────────────────────────

export function detectOrderBlocks(candles: OHLCCandle[]): OrderBlock[] {
  if (candles.length < 5) return [];

  const results: OrderBlock[] = [];

  for (let i = 1; i < candles.length - 2; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];
    const next2 = candles[i + 2];

    // Bullish order block: last bearish candle before a strong bullish move
    const prevBearish = prev.close < prev.open;
    const currBullish = curr.close > curr.open;
    const strongMove = next.close > prev.high && next2.close > next.close;
    const bodyRatio =
      prev.open - prev.close > 0
        ? (prev.open - prev.close) / (prev.high - prev.low + 0.0001)
        : 0;

    if (prevBearish && currBullish && strongMove && bodyRatio > 0.3) {
      results.push({
        index: i - 1,
        type: 'OrderBlock',
        direction: 'bullish',
        high: prev.open,
        low: prev.close,
        price: (prev.open + prev.close) / 2,
        confidence: Math.min(0.9, 0.5 + bodyRatio * 0.5),
        explanation: `Bullish order block: bearish candle at index ${i - 1} preceded a strong move up`,
        mitigated: false,
      });
    }

    // Bearish order block: last bullish candle before a strong bearish move
    const prevBullish = prev.close > prev.open;
    const currBearish = curr.close < curr.open;
    const strongDown = next.close < prev.low && next2.close < next.close;
    const bearBodyRatio =
      prev.close - prev.open > 0
        ? (prev.close - prev.open) / (prev.high - prev.low + 0.0001)
        : 0;

    if (prevBullish && currBearish && strongDown && bearBodyRatio > 0.3) {
      results.push({
        index: i - 1,
        type: 'OrderBlock',
        direction: 'bearish',
        high: prev.close,
        low: prev.open,
        price: (prev.open + prev.close) / 2,
        confidence: Math.min(0.9, 0.5 + bearBodyRatio * 0.5),
        explanation: `Bearish order block: bullish candle at index ${i - 1} preceded a strong move down`,
        mitigated: false,
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Fair Value Gaps
// ─────────────────────────────────────────────────────────────

export function detectFairValueGaps(candles: OHLCCandle[]): FairValueGap[] {
  if (candles.length < 3) return [];

  const results: FairValueGap[] = [];

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    // Bullish FVG: gap between candle 1 high and candle 3 low
    if (c3.low > c1.high) {
      const gapSize = c3.low - c1.high;
      const rangeSize = c2.high - c2.low;
      const filled = false; // We check filling later

      results.push({
        index: i,
        type: 'FairValueGap',
        direction: 'bullish',
        price: (c1.high + c3.low) / 2,
        gapHigh: c3.low,
        gapLow: c1.high,
        filled,
        confidence: Math.min(0.85, 0.5 + gapSize / (rangeSize + 0.0001) * 0.3),
        explanation: `Bullish FVG between ${c1.high.toFixed(2)} and ${c3.low.toFixed(2)} at index ${i}`,
      });
    }

    // Bearish FVG: gap between candle 1 low and candle 3 high
    if (c3.high < c1.low) {
      const gapSize = c1.low - c3.high;
      const rangeSize = c2.high - c2.low;

      results.push({
        index: i,
        type: 'FairValueGap',
        direction: 'bearish',
        price: (c1.low + c3.high) / 2,
        gapHigh: c1.low,
        gapLow: c3.high,
        filled: false,
        confidence: Math.min(0.85, 0.5 + gapSize / (rangeSize + 0.0001) * 0.3),
        explanation: `Bearish FVG between ${c3.high.toFixed(2)} and ${c1.low.toFixed(2)} at index ${i}`,
      });
    }
  }

  // Check if any FVGs have been filled
  for (const fvg of results) {
    for (let i = fvg.index + 1; i < candles.length; i++) {
      if (fvg.direction === 'bullish' && candles[i].low <= fvg.gapLow) {
        fvg.filled = true;
        break;
      }
      if (fvg.direction === 'bearish' && candles[i].high >= fvg.gapHigh) {
        fvg.filled = true;
        break;
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Equal Highs / Lows
// ─────────────────────────────────────────────────────────────

export function detectEqualHighsLows(
  candles: OHLCCandle[],
  tolerance = 0.005,
): EqualHighLow[] {
  if (candles.length < 5) return [];

  const swings = detectSwings(candles, 2);
  const results: EqualHighLow[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < swings.length; i++) {
    const sw = swings[i];
    const group: SwingPoint[] = [sw];

    for (let j = i + 1; j < swings.length; j++) {
      if (swings[j].type !== sw.type) continue;
      const diff = Math.abs(swings[j].price - sw.price) / sw.price;
      if (diff <= tolerance) {
        group.push(swings[j]);
      }
    }

    if (group.length >= 2) {
      const key = `${sw.type}-${sw.index}`;
      if (visited.has(key)) continue;
      group.forEach((g) => visited.add(`${sw.type}-${g.index}`));

      const avgLevel = group.reduce((s, g) => s + g.price, 0) / group.length;
      const lastSwing = group[group.length - 1];

      results.push({
        index: lastSwing.index,
        type: 'EqualHighLow',
        direction: sw.type === 'high' ? 'bearish' : 'bullish',
        price: avgLevel,
        equalLevel: avgLevel,
        count: group.length,
        isHigh: sw.type === 'high',
        confidence: Math.min(0.9, 0.5 + group.length * 0.1),
        explanation: `${group.length} equal ${sw.type === 'high' ? 'highs' : 'lows'} near ${avgLevel.toFixed(2)} — potential liquidity target`,
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Premium / Discount Zone
// ─────────────────────────────────────────────────────────────

export function detectPremiumDiscount(
  candles: OHLCCandle[],
  lookback = 60,
): PremiumDiscount | null {
  if (candles.length < 5) return null;

  const recent = candles.slice(-Math.min(lookback, candles.length));
  const rangeHigh = Math.max(...recent.map((c) => c.high));
  const rangeLow = Math.min(...recent.map((c) => c.low));
  const midpoint = (rangeHigh + rangeLow) / 2;
  const currentPrice = candles[candles.length - 1].close;
  const range = rangeHigh - rangeLow;

  if (range === 0) return null;

  const position = (currentPrice - rangeLow) / range;

  let zone: 'premium' | 'discount' | 'equilibrium';
  if (position > 0.6) zone = 'premium';
  else if (position < 0.4) zone = 'discount';
  else zone = 'equilibrium';

  const direction: SmartMoneyDirection = zone === 'discount' ? 'bullish' : zone === 'premium' ? 'bearish' : 'bullish';

  return {
    index: candles.length - 1,
    type: 'PremiumDiscount',
    direction,
    price: currentPrice,
    zone,
    rangeHigh,
    rangeLow,
    midpoint,
    confidence: Math.abs(position - 0.5) * 2,
    explanation: `Price is in the ${zone} zone (${(position * 100).toFixed(1)}% of range). Range: ${rangeLow.toFixed(2)} - ${rangeHigh.toFixed(2)}, Midpoint: ${midpoint.toFixed(2)}`,
  };
}

// ─────────────────────────────────────────────────────────────
// Mitigation
// ─────────────────────────────────────────────────────────────

export function detectMitigation(
  candles: OHLCCandle[],
  orderBlocks: OrderBlock[],
): Mitigation[] {
  if (candles.length < 5 || orderBlocks.length === 0) return [];

  const results: Mitigation[] = [];

  for (const ob of orderBlocks) {
    if (ob.mitigated) continue;

    for (let i = ob.index + 2; i < candles.length; i++) {
      const c = candles[i];

      if (ob.direction === 'bullish') {
        // Price returns to the bullish OB zone (price dips into OB low-high range)
        if (c.low <= ob.high && c.close > ob.low) {
          ob.mitigated = true;
          results.push({
            index: i,
            type: 'Mitigation',
            direction: 'bullish',
            price: ob.price,
            orderBlockIndex: ob.index,
            confidence: 0.7,
            explanation: `Price mitigated bullish order block at index ${ob.index} — potential entry zone`,
          });
          break;
        }
      }

      if (ob.direction === 'bearish') {
        // Price returns to the bearish OB zone
        if (c.high >= ob.low && c.close < ob.high) {
          ob.mitigated = true;
          results.push({
            index: i,
            type: 'Mitigation',
            direction: 'bearish',
            price: ob.price,
            orderBlockIndex: ob.index,
            confidence: 0.7,
            explanation: `Price mitigated bearish order block at index ${ob.index} — potential entry zone`,
          });
          break;
        }
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Breaker Blocks
// ─────────────────────────────────────────────────────────────

export function detectBreakerBlocks(
  candles: OHLCCandle[],
  orderBlocks?: OrderBlock[],
): BreakerBlock[] {
  const obs = orderBlocks ?? detectOrderBlocks(candles);
  if (candles.length < 5 || obs.length === 0) return [];

  const results: BreakerBlock[] = [];

  for (const ob of obs) {
    // A breaker block forms when an order block is violated (price breaks through it)
    for (let i = ob.index + 2; i < candles.length; i++) {
      const c = candles[i];

      if (ob.direction === 'bullish') {
        // Bullish OB was broken: price closed below its low → becomes bearish breaker
        if (c.close < ob.low) {
          results.push({
            index: i,
            type: 'BreakerBlock',
            direction: 'bearish',
            price: ob.price,
            originalOrderBlockIndex: ob.index,
            confidence: 0.65,
            explanation: `Failed bullish order block at index ${ob.index} became a bearish breaker block`,
          });
          break;
        }
      }

      if (ob.direction === 'bearish') {
        // Bearish OB was broken: price closed above its high → becomes bullish breaker
        if (c.close > ob.high) {
          results.push({
            index: i,
            type: 'BreakerBlock',
            direction: 'bullish',
            price: ob.price,
            originalOrderBlockIndex: ob.index,
            confidence: 0.65,
            explanation: `Failed bearish order block at index ${ob.index} became a bullish breaker block`,
          });
          break;
        }
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Run All Smart Money Detections
// ─────────────────────────────────────────────────────────────

export function runSmartMoney(candles: OHLCCandle[]): SmartMoneyResult {
  const breakOfStructure = detectBOS(candles);
  const changeOfCharacter = detectCHoCH(candles);
  const liquiditySweep = detectLiquiditySweep(candles);
  const orderBlocks = detectOrderBlocks(candles);
  const fairValueGaps = detectFairValueGaps(candles);
  const equalHighsLows = detectEqualHighsLows(candles);
  const premiumDiscount = detectPremiumDiscount(candles);
  const mitigations = detectMitigation(candles, orderBlocks);
  const breakerBlocks = detectBreakerBlocks(candles, orderBlocks);

  return {
    breakOfStructure,
    changeOfCharacter,
    liquiditySweep,
    orderBlocks,
    fairValueGaps,
    equalHighsLows,
    premiumDiscount,
    mitigations,
    breakerBlocks,
  };
}
