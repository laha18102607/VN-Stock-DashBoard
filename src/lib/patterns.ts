import type { OHLCCandle, PatternDetection, CandlestickPatterns, PatternDirection } from './types';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function bodySize(c: OHLCCandle): number {
  return Math.abs(c.close - c.open);
}

function upperShadow(c: OHLCCandle): number {
  return c.high - Math.max(c.open, c.close);
}

function lowerShadow(c: OHLCCandle): number {
  return Math.min(c.open, c.close) - c.low;
}

function totalRange(c: OHLCCandle): number {
  return c.high - c.low;
}

function isBullish(c: OHLCCandle): boolean {
  return c.close > c.open;
}

function isBearish(c: OHLCCandle): boolean {
  return c.close < c.open;
}

function emptyDetection(name: string): PatternDetection {
  return {
    name,
    detected: false,
    index: -1,
    direction: 'neutral',
    confidence: 0,
    explanation: `${name} not detected`,
  };
}

// ─────────────────────────────────────────────────────────────
// Doji: body is very small relative to total range
// ─────────────────────────────────────────────────────────────

export function detectDoji(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 1) return emptyDetection('Doji');
  const c = candles[candles.length - 1];
  const idx = candles.length - 1;
  const range = totalRange(c);

  if (range === 0) return emptyDetection('Doji');

  const bodyRatio = bodySize(c) / range;

  if (bodyRatio <= 0.1) {
    const confidence = Math.max(0.6, 1 - bodyRatio * 5);
    return {
      name: 'Doji',
      detected: true,
      index: idx,
      direction: 'neutral',
      confidence,
      explanation: `Doji at index ${idx}: body is ${(bodyRatio * 100).toFixed(1)}% of range — market indecision`,
    };
  }

  return emptyDetection('Doji');
}

// ─────────────────────────────────────────────────────────────
// Hammer: small body at top, long lower shadow (>= 2x body)
// ─────────────────────────────────────────────────────────────

export function detectHammer(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 2) return emptyDetection('Hammer');
  const c = candles[candles.length - 1];
  const idx = candles.length - 1;
  const body = bodySize(c);
  const range = totalRange(c);

  if (range === 0) return emptyDetection('Hammer');

  const lower = lowerShadow(c);
  const upper = upperShadow(c);

  // Lower shadow >= 2x body, upper shadow small
  if (lower >= body * 2 && upper <= body * 0.5 && body / range < 0.35) {
    const confidence = Math.min(0.9, 0.5 + (lower / body) * 0.1);
    return {
      name: 'Hammer',
      detected: true,
      index: idx,
      direction: 'bullish',
      confidence,
      explanation: `Hammer at index ${idx}: lower shadow is ${(lower / body).toFixed(1)}x body — potential bullish reversal`,
    };
  }

  return emptyDetection('Hammer');
}

// ─────────────────────────────────────────────────────────────
// Shooting Star: small body at bottom, long upper shadow
// ─────────────────────────────────────────────────────────────

export function detectShootingStar(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 2) return emptyDetection('ShootingStar');
  const c = candles[candles.length - 1];
  const idx = candles.length - 1;
  const body = bodySize(c);
  const range = totalRange(c);

  if (range === 0) return emptyDetection('ShootingStar');

  const upper = upperShadow(c);
  const lower = lowerShadow(c);

  if (upper >= body * 2 && lower <= body * 0.5 && body / range < 0.35) {
    const confidence = Math.min(0.9, 0.5 + (upper / body) * 0.1);
    return {
      name: 'ShootingStar',
      detected: true,
      index: idx,
      direction: 'bearish',
      confidence,
      explanation: `Shooting Star at index ${idx}: upper shadow is ${(upper / body).toFixed(1)}x body — potential bearish reversal`,
    };
  }

  return emptyDetection('ShootingStar');
}

// ─────────────────────────────────────────────────────────────
// Morning Star: 3-candle bullish reversal
// Candle 1: large bearish, Candle 2: small body (star), Candle 3: large bullish
// ─────────────────────────────────────────────────────────────

export function detectMorningStar(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 3) return emptyDetection('MorningStar');
  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];
  const idx = candles.length - 1;

  const c1Bearish = isBearish(c1) && bodySize(c1) > totalRange(c1) * 0.5;
  const c2Small = bodySize(c2) < totalRange(c1) * 0.3;
  const c2GapDown = Math.max(c2.open, c2.close) < c1.close;
  const c3Bullish = isBullish(c3) && bodySize(c3) > totalRange(c3) * 0.5;
  const c3AboveMid = c3.close > (c1.open + c1.close) / 2;

  if (c1Bearish && c2Small && c3Bullish && c3AboveMid) {
    const confidence = c2GapDown ? 0.85 : 0.7;
    return {
      name: 'MorningStar',
      detected: true,
      index: idx,
      direction: 'bullish',
      confidence,
      explanation: `Morning Star at index ${idx}: bearish candle → small star → strong bullish candle — bullish reversal`,
    };
  }

  return emptyDetection('MorningStar');
}

// ─────────────────────────────────────────────────────────────
// Evening Star: 3-candle bearish reversal
// Candle 1: large bullish, Candle 2: small body (star), Candle 3: large bearish
// ─────────────────────────────────────────────────────────────

export function detectEveningStar(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 3) return emptyDetection('EveningStar');
  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];
  const idx = candles.length - 1;

  const c1Bullish = isBullish(c1) && bodySize(c1) > totalRange(c1) * 0.5;
  const c2Small = bodySize(c2) < totalRange(c1) * 0.3;
  const c2GapUp = Math.min(c2.open, c2.close) > c1.close;
  const c3Bearish = isBearish(c3) && bodySize(c3) > totalRange(c3) * 0.5;
  const c3BelowMid = c3.close < (c1.open + c1.close) / 2;

  if (c1Bullish && c2Small && c3Bearish && c3BelowMid) {
    const confidence = c2GapUp ? 0.85 : 0.7;
    return {
      name: 'EveningStar',
      detected: true,
      index: idx,
      direction: 'bearish',
      confidence,
      explanation: `Evening Star at index ${idx}: bullish candle → small star → strong bearish candle — bearish reversal`,
    };
  }

  return emptyDetection('EveningStar');
}

// ─────────────────────────────────────────────────────────────
// Bullish Engulfing: bearish candle followed by bullish candle
// whose body completely engulfs the first candle's body
// ─────────────────────────────────────────────────────────────

export function detectBullishEngulfing(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 2) return emptyDetection('BullishEngulfing');
  const c1 = candles[candles.length - 2];
  const c2 = candles[candles.length - 1];
  const idx = candles.length - 1;

  if (
    isBearish(c1) &&
    isBullish(c2) &&
    c2.open <= c1.close &&
    c2.close >= c1.open &&
    bodySize(c2) > bodySize(c1)
  ) {
    const engulfRatio = bodySize(c2) / (bodySize(c1) + 0.0001);
    const confidence = Math.min(0.9, 0.6 + engulfRatio * 0.1);
    return {
      name: 'BullishEngulfing',
      detected: true,
      index: idx,
      direction: 'bullish',
      confidence,
      explanation: `Bullish Engulfing at index ${idx}: bullish candle body completely engulfs previous bearish candle — strong bullish signal`,
    };
  }

  return emptyDetection('BullishEngulfing');
}

// ─────────────────────────────────────────────────────────────
// Bearish Engulfing: bullish candle followed by bearish candle
// whose body completely engulfs the first candle's body
// ─────────────────────────────────────────────────────────────

export function detectBearishEngulfing(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 2) return emptyDetection('BearishEngulfing');
  const c1 = candles[candles.length - 2];
  const c2 = candles[candles.length - 1];
  const idx = candles.length - 1;

  if (
    isBullish(c1) &&
    isBearish(c2) &&
    c2.open >= c1.close &&
    c2.close <= c1.open &&
    bodySize(c2) > bodySize(c1)
  ) {
    const engulfRatio = bodySize(c2) / (bodySize(c1) + 0.0001);
    const confidence = Math.min(0.9, 0.6 + engulfRatio * 0.1);
    return {
      name: 'BearishEngulfing',
      detected: true,
      index: idx,
      direction: 'bearish',
      confidence,
      explanation: `Bearish Engulfing at index ${idx}: bearish candle body completely engulfs previous bullish candle — strong bearish signal`,
    };
  }

  return emptyDetection('BearishEngulfing');
}

// ─────────────────────────────────────────────────────────────
// Harami: large candle followed by small candle whose body
// is entirely within the first candle's body
// ─────────────────────────────────────────────────────────────

export function detectHarami(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 2) return emptyDetection('Harami');
  const c1 = candles[candles.length - 2];
  const c2 = candles[candles.length - 1];
  const idx = candles.length - 1;

  const c1Body = bodySize(c1);
  const c2Body = bodySize(c2);

  if (c1Body === 0) return emptyDetection('Harami');

  const c1High = Math.max(c1.open, c1.close);
  const c1Low = Math.min(c1.open, c1.close);
  const c2High = Math.max(c2.open, c2.close);
  const c2Low = Math.min(c2.open, c2.close);

  if (c2High <= c1High && c2Low >= c1Low && c2Body < c1Body * 0.6) {
    const direction: PatternDirection = isBearish(c1) ? 'bullish' : 'bearish';
    const confidence = Math.min(0.8, 0.5 + (1 - c2Body / c1Body) * 0.3);
    return {
      name: 'Harami',
      detected: true,
      index: idx,
      direction,
      confidence,
      explanation: `Harami at index ${idx}: small candle body contained within previous large ${isBearish(c1) ? 'bearish' : 'bullish'} candle — potential reversal`,
    };
  }

  return emptyDetection('Harami');
}

// ─────────────────────────────────────────────────────────────
// Piercing Pattern: bearish candle followed by bullish candle
// that opens below the first candle's low and closes above its midpoint
// ─────────────────────────────────────────────────────────────

export function detectPiercingPattern(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 2) return emptyDetection('PiercingPattern');
  const c1 = candles[candles.length - 2];
  const c2 = candles[candles.length - 1];
  const idx = candles.length - 1;

  const c1Mid = (c1.open + c1.close) / 2;

  if (
    isBearish(c1) &&
    bodySize(c1) > totalRange(c1) * 0.5 &&
    isBullish(c2) &&
    c2.open < c1.low &&
    c2.close > c1Mid &&
    c2.close < c1.open
  ) {
    return {
      name: 'PiercingPattern',
      detected: true,
      index: idx,
      direction: 'bullish',
      confidence: 0.75,
      explanation: `Piercing Pattern at index ${idx}: bullish candle opened below low and closed above midpoint of bearish candle`,
    };
  }

  return emptyDetection('PiercingPattern');
}

// ─────────────────────────────────────────────────────────────
// Dark Cloud Cover: bullish candle followed by bearish candle
// that opens above the first candle's high and closes below its midpoint
// ─────────────────────────────────────────────────────────────

export function detectDarkCloudCover(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 2) return emptyDetection('DarkCloudCover');
  const c1 = candles[candles.length - 2];
  const c2 = candles[candles.length - 1];
  const idx = candles.length - 1;

  const c1Mid = (c1.open + c1.close) / 2;

  if (
    isBullish(c1) &&
    bodySize(c1) > totalRange(c1) * 0.5 &&
    isBearish(c2) &&
    c2.open > c1.high &&
    c2.close < c1Mid &&
    c2.close > c1.open
  ) {
    return {
      name: 'DarkCloudCover',
      detected: true,
      index: idx,
      direction: 'bearish',
      confidence: 0.75,
      explanation: `Dark Cloud Cover at index ${idx}: bearish candle opened above high and closed below midpoint of bullish candle`,
    };
  }

  return emptyDetection('DarkCloudCover');
}

// ─────────────────────────────────────────────────────────────
// Three White Soldiers: 3 consecutive bullish candles, each
// closing higher than the last, with small upper shadows
// ─────────────────────────────────────────────────────────────

export function detectThreeWhiteSoldiers(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 3) return emptyDetection('ThreeWhiteSoldiers');
  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];
  const idx = candles.length - 1;

  const allBullish = isBullish(c1) && isBullish(c2) && isBullish(c3);
  const risingCloses = c2.close > c1.close && c3.close > c2.close;
  const opensInBody =
    c2.open > c1.open &&
    c2.open < c1.close &&
    c3.open > c2.open &&
    c3.open < c2.close;
  const smallUpperShadows =
    upperShadow(c1) < bodySize(c1) * 0.3 &&
    upperShadow(c2) < bodySize(c2) * 0.3 &&
    upperShadow(c3) < bodySize(c3) * 0.3;

  if (allBullish && risingCloses && opensInBody && smallUpperShadows) {
    return {
      name: 'ThreeWhiteSoldiers',
      detected: true,
      index: idx,
      direction: 'bullish',
      confidence: 0.85,
      explanation: `Three White Soldiers at index ${idx}: three consecutive strong bullish candles — strong bullish continuation`,
    };
  }

  return emptyDetection('ThreeWhiteSoldiers');
}

// ─────────────────────────────────────────────────────────────
// Three Black Crows: 3 consecutive bearish candles, each
// closing lower than the last, with small lower shadows
// ─────────────────────────────────────────────────────────────

export function detectThreeBlackCrows(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 3) return emptyDetection('ThreeBlackCrows');
  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];
  const idx = candles.length - 1;

  const allBearish = isBearish(c1) && isBearish(c2) && isBearish(c3);
  const fallingCloses = c2.close < c1.close && c3.close < c2.close;
  const opensInBody =
    c2.open < c1.open &&
    c2.open > c1.close &&
    c3.open < c2.open &&
    c3.open > c2.close;
  const smallLowerShadows =
    lowerShadow(c1) < bodySize(c1) * 0.3 &&
    lowerShadow(c2) < bodySize(c2) * 0.3 &&
    lowerShadow(c3) < bodySize(c3) * 0.3;

  if (allBearish && fallingCloses && opensInBody && smallLowerShadows) {
    return {
      name: 'ThreeBlackCrows',
      detected: true,
      index: idx,
      direction: 'bearish',
      confidence: 0.85,
      explanation: `Three Black Crows at index ${idx}: three consecutive strong bearish candles — strong bearish continuation`,
    };
  }

  return emptyDetection('ThreeBlackCrows');
}

// ─────────────────────────────────────────────────────────────
// Marubozu: candle with almost no shadows — body is nearly
// the entire range
// ─────────────────────────────────────────────────────────────

export function detectMarubozu(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 1) return emptyDetection('Marubozu');
  const c = candles[candles.length - 1];
  const idx = candles.length - 1;
  const range = totalRange(c);

  if (range === 0) return emptyDetection('Marubozu');

  const bodyRatio = bodySize(c) / range;

  if (bodyRatio >= 0.9) {
    const direction: PatternDirection = isBullish(c) ? 'bullish' : 'bearish';
    return {
      name: 'Marubozu',
      detected: true,
      index: idx,
      direction,
      confidence: Math.min(0.95, bodyRatio),
      explanation: `Marubozu at index ${idx}: body is ${(bodyRatio * 100).toFixed(1)}% of range — strong ${direction} momentum`,
    };
  }

  return emptyDetection('Marubozu');
}

// ─────────────────────────────────────────────────────────────
// Spinning Top: small body, roughly equal upper and lower shadows
// ─────────────────────────────────────────────────────────────

export function detectSpinningTop(candles: OHLCCandle[]): PatternDetection {
  if (candles.length < 1) return emptyDetection('SpinningTop');
  const c = candles[candles.length - 1];
  const idx = candles.length - 1;
  const range = totalRange(c);

  if (range === 0) return emptyDetection('SpinningTop');

  const body = bodySize(c);
  const upper = upperShadow(c);
  const lower = lowerShadow(c);
  const bodyRatio = body / range;

  // Small body (<35% of range), both shadows present and roughly equal
  if (bodyRatio < 0.35 && upper > body * 0.5 && lower > body * 0.5) {
    const shadowDiff = Math.abs(upper - lower) / (range + 0.0001);
    const confidence = Math.min(0.8, 0.5 + (1 - shadowDiff) * 0.3);
    return {
      name: 'SpinningTop',
      detected: true,
      index: idx,
      direction: 'neutral',
      confidence,
      explanation: `Spinning Top at index ${idx}: small body with equal shadows — market indecision`,
    };
  }

  return emptyDetection('SpinningTop');
}

// ─────────────────────────────────────────────────────────────
// Run All Pattern Detectors
// ─────────────────────────────────────────────────────────────

export function runAllPatterns(candles: OHLCCandle[]): CandlestickPatterns {
  return {
    doji: detectDoji(candles),
    hammer: detectHammer(candles),
    shootingStar: detectShootingStar(candles),
    morningStar: detectMorningStar(candles),
    eveningStar: detectEveningStar(candles),
    bullishEngulfing: detectBullishEngulfing(candles),
    bearishEngulfing: detectBearishEngulfing(candles),
    harami: detectHarami(candles),
    piercingPattern: detectPiercingPattern(candles),
    darkCloudCover: detectDarkCloudCover(candles),
    threeWhiteSoldiers: detectThreeWhiteSoldiers(candles),
    threeBlackCrows: detectThreeBlackCrows(candles),
    marubozu: detectMarubozu(candles),
    spinningTop: detectSpinningTop(candles),
  };
}
