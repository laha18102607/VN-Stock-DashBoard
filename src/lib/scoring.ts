import type {
  OHLCCandle,
  StockInfo,
  SmartMoneyResult,
  CandlestickPatterns,
  TrendScore,
  MomentumScore,
  VolumeScore,
  RiskScore,
  FundamentalScore,
  TechnicalScore,
  OverallScore,
  PatternDetection,
} from './types';
import { Recommendation } from './types';

// ─────────────────────────────────────────────────────────────
// Indicator context object (passed from runAllIndicators)
// ─────────────────────────────────────────────────────────────

export interface IndicatorContext {
  sma: { values: number[] };
  ema: { values: number[] };
  rsi: { values: number[] };
  macd: { values: { macdLine: number; signalLine: number; histogram: number }[] };
  bollingerBands: { values: { upper: number; middle: number; lower: number }[] };
  atr: { values: number[] };
  adx: { values: { adx: number; plusDI: number; minusDI: number }[] };
  obv: { values: number[] };
  stochastic: { values: { k: number; d: number }[] };
  cci: { values: number[] };
  supertrend: { values: { value: number; trend: 'up' | 'down' }[] };
  mfi: { values: number[] };
}

function lastVal<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

// ─────────────────────────────────────────────────────────────
// Trend Score (25%)
// ─────────────────────────────────────────────────────────────

export function calculateTrendScore(
  indicators: IndicatorContext,
  smartMoney: SmartMoneyResult,
  candles: OHLCCandle[],
): TrendScore {
  const details: string[] = [];
  let score = 50; // neutral baseline
  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

  // SMA: price above SMA = bullish
  const smaVal = lastVal(indicators.sma.values);
  if (smaVal !== undefined && currentPrice > 0) {
    if (currentPrice > smaVal) {
      score += 10;
      details.push(`Price above SMA(${smaVal.toFixed(2)}): bullish`);
    } else {
      score -= 10;
      details.push(`Price below SMA(${smaVal.toFixed(2)}): bearish`);
    }
  }

  // EMA: price above EMA = bullish
  const emaVal = lastVal(indicators.ema.values);
  if (emaVal !== undefined && currentPrice > 0) {
    if (currentPrice > emaVal) {
      score += 8;
      details.push(`Price above EMA(${emaVal.toFixed(2)}): bullish`);
    } else {
      score -= 8;
      details.push(`Price below EMA(${emaVal.toFixed(2)}): bearish`);
    }
  }

  // Supertrend
  const st = lastVal(indicators.supertrend.values);
  if (st) {
    if (st.trend === 'up') {
      score += 10;
      details.push('Supertrend: uptrend');
    } else {
      score -= 10;
      details.push('Supertrend: downtrend');
    }
  }

  // ADX: strength of trend
  const adxVal = lastVal(indicators.adx.values);
  if (adxVal) {
    if (adxVal.adx > 25) {
      const dir = adxVal.plusDI > adxVal.minusDI ? 'bullish' : 'bearish';
      if (dir === 'bullish') {
        score += Math.min(12, adxVal.adx * 0.3);
        details.push(`ADX(${adxVal.adx.toFixed(1)}): strong bullish trend`);
      } else {
        score -= Math.min(12, adxVal.adx * 0.3);
        details.push(`ADX(${adxVal.adx.toFixed(1)}): strong bearish trend`);
      }
    } else {
      details.push(`ADX(${adxVal.adx.toFixed(1)}): weak/no trend`);
    }
  }

  // Smart Money: BOS and CHoCH
  const recentBOS = smartMoney.breakOfStructure.slice(-3);
  const bullishBOS = recentBOS.filter((b) => b.direction === 'bullish').length;
  const bearishBOS = recentBOS.filter((b) => b.direction === 'bearish').length;
  score += (bullishBOS - bearishBOS) * 5;
  if (bullishBOS > bearishBOS) details.push(`${bullishBOS} bullish BOS detected`);
  if (bearishBOS > bullishBOS) details.push(`${bearishBOS} bearish BOS detected`);

  return {
    name: 'Trend',
    weight: 0.25,
    score: clamp(score),
    details,
  };
}

// ─────────────────────────────────────────────────────────────
// Momentum Score (20%)
// ─────────────────────────────────────────────────────────────

export function calculateMomentumScore(indicators: IndicatorContext): MomentumScore {
  const details: string[] = [];
  let score = 50;

  // RSI
  const rsiVal = lastVal(indicators.rsi.values);
  if (rsiVal !== undefined) {
    if (rsiVal > 70) {
      score -= (rsiVal - 70) * 0.8;
      details.push(`RSI(${rsiVal.toFixed(1)}): overbought`);
    } else if (rsiVal < 30) {
      score += (30 - rsiVal) * 0.8;
      details.push(`RSI(${rsiVal.toFixed(1)}): oversold — potential bounce`);
    } else if (rsiVal > 50) {
      score += (rsiVal - 50) * 0.4;
      details.push(`RSI(${rsiVal.toFixed(1)}): bullish momentum`);
    } else {
      score -= (50 - rsiVal) * 0.4;
      details.push(`RSI(${rsiVal.toFixed(1)}): bearish momentum`);
    }
  }

  // MACD histogram
  const macdVal = lastVal(indicators.macd.values);
  if (macdVal) {
    if (macdVal.histogram > 0) {
      score += Math.min(10, macdVal.histogram * 2);
      details.push(`MACD histogram positive (${macdVal.histogram.toFixed(3)}): bullish`);
    } else {
      score += Math.max(-10, macdVal.histogram * 2);
      details.push(`MACD histogram negative (${macdVal.histogram.toFixed(3)}): bearish`);
    }

    // MACD crossover
    if (macdVal.macdLine > macdVal.signalLine) {
      score += 5;
      details.push('MACD above signal line: bullish crossover');
    } else {
      score -= 5;
      details.push('MACD below signal line: bearish crossover');
    }
  }

  // Stochastic
  const stoch = lastVal(indicators.stochastic.values);
  if (stoch) {
    if (stoch.k > 80 && stoch.d > 80) {
      score -= 8;
      details.push(`Stochastic overbought (K:${stoch.k.toFixed(1)}, D:${stoch.d.toFixed(1)})`);
    } else if (stoch.k < 20 && stoch.d < 20) {
      score += 8;
      details.push(`Stochastic oversold (K:${stoch.k.toFixed(1)}, D:${stoch.d.toFixed(1)}) — potential bounce`);
    } else if (stoch.k > stoch.d) {
      score += 4;
      details.push('Stochastic K > D: bullish');
    } else {
      score -= 4;
      details.push('Stochastic K < D: bearish');
    }
  }

  // CCI
  const cciVal = lastVal(indicators.cci.values);
  if (cciVal !== undefined) {
    if (cciVal > 100) {
      score -= 5;
      details.push(`CCI(${cciVal.toFixed(1)}): overbought`);
    } else if (cciVal < -100) {
      score += 5;
      details.push(`CCI(${cciVal.toFixed(1)}): oversold`);
    }
  }

  // MFI
  const mfiVal = lastVal(indicators.mfi.values);
  if (mfiVal !== undefined) {
    if (mfiVal > 80) {
      score -= 4;
      details.push(`MFI(${mfiVal.toFixed(1)}): overbought`);
    } else if (mfiVal < 20) {
      score += 4;
      details.push(`MFI(${mfiVal.toFixed(1)}): oversold`);
    }
  }

  return {
    name: 'Momentum',
    weight: 0.20,
    score: clamp(score),
    details,
  };
}

// ─────────────────────────────────────────────────────────────
// Volume Score (15%)
// ─────────────────────────────────────────────────────────────

export function calculateVolumeScore(
  indicators: IndicatorContext,
  candles: OHLCCandle[],
): VolumeScore {
  const details: string[] = [];
  let score = 50;

  if (candles.length < 20) {
    return { name: 'Volume', weight: 0.15, score, details: ['Insufficient data'] };
  }

  // Volume trend: compare recent average volume to older average
  const recentVols = candles.slice(-10).map((c) => c.volume);
  const olderVols = candles.slice(-20, -10).map((c) => c.volume);
  const recentAvg = recentVols.reduce((a, b) => a + b, 0) / 10;
  const olderAvg = olderVols.reduce((a, b) => a + b, 0) / 10;

  if (olderAvg > 0) {
    const volRatio = recentAvg / olderAvg;
    if (volRatio > 1.5) {
      score += 10;
      details.push(`Volume increasing: ${volRatio.toFixed(1)}x recent average — strong interest`);
    } else if (volRatio < 0.7) {
      score -= 8;
      details.push(`Volume decreasing: ${volRatio.toFixed(1)}x recent average — weak interest`);
    } else {
      details.push(`Volume stable: ${volRatio.toFixed(1)}x recent average`);
    }
  }

  // OBV trend
  const obvValues = indicators.obv.values;
  if (obvValues.length >= 10) {
    const recentOBV = obvValues.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const olderOBV = obvValues.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;

    if (recentOBV > olderOBV) {
      score += 8;
      details.push('OBV rising: accumulation phase');
    } else {
      score -= 8;
      details.push('OBV falling: distribution phase');
    }
  }

  // MFI: volume-weighted momentum
  const mfiVal = lastVal(indicators.mfi.values);
  if (mfiVal !== undefined) {
    if (mfiVal > 50) {
      score += 5;
      details.push(`MFI(${mfiVal.toFixed(1)}): money flowing in`);
    } else {
      score -= 5;
      details.push(`MFI(${mfiVal.toFixed(1)}): money flowing out`);
    }
  }

  // Price up + Volume up = strong bullish
  // Price down + Volume up = strong bearish
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const priceUp = lastCandle.close > prevCandle.close;
  const volUp = lastCandle.volume > prevCandle.volume;

  if (priceUp && volUp) {
    score += 7;
    details.push('Price up + Volume up: strong bullish confirmation');
  } else if (!priceUp && volUp) {
    score -= 7;
    details.push('Price down + Volume up: strong bearish confirmation');
  }

  return {
    name: 'Volume',
    weight: 0.15,
    score: clamp(score),
    details,
  };
}

// ─────────────────────────────────────────────────────────────
// Risk Score (15%) — lower volatility = higher score
// ─────────────────────────────────────────────────────────────

export function calculateRiskScore(
  indicators: IndicatorContext,
  candles: OHLCCandle[],
): RiskScore {
  const details: string[] = [];
  let score = 50;

  // ATR relative to price: lower = less risk
  const atrVal = lastVal(indicators.atr.values);
  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 1;

  if (atrVal !== undefined && currentPrice > 0) {
    const atrPct = (atrVal / currentPrice) * 100;
    if (atrPct < 1) {
      score += 20;
      details.push(`ATR ${atrPct.toFixed(2)}%: very low volatility`);
    } else if (atrPct < 2) {
      score += 10;
      details.push(`ATR ${atrPct.toFixed(2)}%: low volatility`);
    } else if (atrPct < 4) {
      details.push(`ATR ${atrPct.toFixed(2)}%: moderate volatility`);
    } else if (atrPct < 6) {
      score -= 10;
      details.push(`ATR ${atrPct.toFixed(2)}%: high volatility`);
    } else {
      score -= 20;
      details.push(`ATR ${atrPct.toFixed(2)}%: very high volatility`);
    }
  }

  // Bollinger Band width: narrow = less risk
  const bb = lastVal(indicators.bollingerBands.values);
  if (bb && bb.middle > 0) {
    const bbWidth = ((bb.upper - bb.lower) / bb.middle) * 100;
    if (bbWidth < 3) {
      score += 10;
      details.push(`BB width ${bbWidth.toFixed(2)}%: narrow — low volatility`);
    } else if (bbWidth > 10) {
      score -= 10;
      details.push(`BB width ${bbWidth.toFixed(2)}%: wide — high volatility`);
    }
  }

  // Beta-like: price range over last 30 days
  if (candles.length >= 30) {
    const recent30 = candles.slice(-30);
    const returns = [];
    for (let i = 1; i < recent30.length; i++) {
      returns.push((recent30[i].close - recent30[i - 1].close) / recent30[i - 1].close);
    }
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance) * 100;

    if (stdDev < 1) {
      score += 10;
      details.push(`30-day std dev ${stdDev.toFixed(2)}%: stable`);
    } else if (stdDev > 3) {
      score -= 10;
      details.push(`30-day std dev ${stdDev.toFixed(2)}%: volatile`);
    }
  }

  // Price proximity to 52w low (danger zone)
  if (candles.length >= 250) {
    const lows52 = candles.slice(-250).map((c) => c.low);
    const min52 = Math.min(...lows52);
    const distFromLow = ((currentPrice - min52) / min52) * 100;

    if (distFromLow < 5) {
      score -= 15;
      details.push(`Only ${distFromLow.toFixed(1)}% above 52-week low — high risk zone`);
    } else if (distFromLow > 50) {
      score += 5;
      details.push(`${distFromLow.toFixed(1)}% above 52-week low — comfortable buffer`);
    }
  }

  return {
    name: 'Risk',
    weight: 0.15,
    score: clamp(score),
    details,
  };
}

// ─────────────────────────────────────────────────────────────
// Fundamental Score (15%)
// ─────────────────────────────────────────────────────────────

export function calculateFundamentalScore(stockInfo: StockInfo | null): FundamentalScore {
  const details: string[] = [];
  let score = 50;

  if (!stockInfo) {
    return {
      name: 'Fundamental',
      weight: 0.15,
      score: 50,
      details: ['No fundamental data available'],
    };
  }

  // P/E ratio
  if (stockInfo.pe > 0) {
    if (stockInfo.pe < 10) {
      score += 15;
      details.push(`P/E ${stockInfo.pe.toFixed(1)}: undervalued`);
    } else if (stockInfo.pe < 20) {
      score += 8;
      details.push(`P/E ${stockInfo.pe.toFixed(1)}: fair value`);
    } else if (stockInfo.pe < 35) {
      score -= 5;
      details.push(`P/E ${stockInfo.pe.toFixed(1)}: slightly overvalued`);
    } else {
      score -= 12;
      details.push(`P/E ${stockInfo.pe.toFixed(1)}: overvalued`);
    }
  }

  // P/B ratio
  if (stockInfo.pb > 0) {
    if (stockInfo.pb < 1) {
      score += 10;
      details.push(`P/B ${stockInfo.pb.toFixed(2)}: trading below book value`);
    } else if (stockInfo.pb < 3) {
      score += 5;
      details.push(`P/B ${stockInfo.pb.toFixed(2)}: reasonable`);
    } else {
      score -= 5;
      details.push(`P/B ${stockInfo.pb.toFixed(2)}: high relative to book value`);
    }
  }

  // ROE
  if (stockInfo.roe > 0) {
    if (stockInfo.roe > 20) {
      score += 12;
      details.push(`ROE ${stockInfo.roe.toFixed(1)}%: excellent`);
    } else if (stockInfo.roe > 10) {
      score += 6;
      details.push(`ROE ${stockInfo.roe.toFixed(1)}%: good`);
    } else if (stockInfo.roe > 0) {
      details.push(`ROE ${stockInfo.roe.toFixed(1)}%: low`);
    }
  }

  // ROA
  if (stockInfo.roa > 0) {
    if (stockInfo.roa > 10) {
      score += 8;
      details.push(`ROA ${stockInfo.roa.toFixed(1)}%: efficient asset use`);
    } else if (stockInfo.roa > 5) {
      score += 4;
      details.push(`ROA ${stockInfo.roa.toFixed(1)}%: decent`);
    }
  }

  // EPS positive
  if (stockInfo.eps > 0) {
    score += 5;
    details.push(`EPS ${stockInfo.eps.toFixed(0)}: profitable`);
  } else if (stockInfo.eps < 0) {
    score -= 10;
    details.push(`EPS ${stockInfo.eps.toFixed(0)}: loss-making`);
  }

  // Beta
  if (stockInfo.beta > 0) {
    if (stockInfo.beta < 0.8) {
      score += 3;
      details.push(`Beta ${stockInfo.beta.toFixed(2)}: low market sensitivity`);
    } else if (stockInfo.beta > 1.5) {
      score -= 5;
      details.push(`Beta ${stockInfo.beta.toFixed(2)}: high market sensitivity`);
    }
  }

  return {
    name: 'Fundamental',
    weight: 0.15,
    score: clamp(score),
    details,
  };
}

// ─────────────────────────────────────────────────────────────
// Technical Score (10%)
// ─────────────────────────────────────────────────────────────

export function calculateTechnicalScore(
  patterns: CandlestickPatterns,
  indicators: IndicatorContext,
): TechnicalScore {
  const details: string[] = [];
  let score = 50;

  // Score detected patterns
  const allPatterns: PatternDetection[] = Object.values(patterns) as PatternDetection[];
  const detected = allPatterns.filter((p) => p.detected);

  for (const p of detected) {
    if (p.direction === 'bullish') {
      score += p.confidence * 8;
      details.push(`Bullish pattern: ${p.name} (${(p.confidence * 100).toFixed(0)}% confidence)`);
    } else if (p.direction === 'bearish') {
      score -= p.confidence * 8;
      details.push(`Bearish pattern: ${p.name} (${(p.confidence * 100).toFixed(0)}% confidence)`);
    } else {
      details.push(`Neutral pattern: ${p.name}`);
    }
  }

  // Bollinger Band position
  const bb = lastVal(indicators.bollingerBands.values);
  if (bb) {
    const bandRange = bb.upper - bb.lower;
    if (bandRange > 0) {
      // We need current price — use bb middle as proxy
      const bbPos = (bb.middle - bb.lower) / bandRange;
      if (bbPos > 0.9) {
        score -= 3;
        details.push('Near upper Bollinger Band: potential resistance');
      } else if (bbPos < 0.1) {
        score += 3;
        details.push('Near lower Bollinger Band: potential support');
      }
    }
  }

  // Supertrend alignment
  const st = lastVal(indicators.supertrend.values);
  if (st) {
    if (st.trend === 'up') {
      score += 5;
      details.push('Supertrend bullish');
    } else {
      score -= 5;
      details.push('Supertrend bearish');
    }
  }

  return {
    name: 'Technical',
    weight: 0.10,
    score: clamp(score),
    details,
  };
}

// ─────────────────────────────────────────────────────────────
// Overall Score
// ─────────────────────────────────────────────────────────────

export function calculateOverallScore(
  trend: TrendScore,
  momentum: MomentumScore,
  volume: VolumeScore,
  risk: RiskScore,
  fundamental: FundamentalScore,
  technical: TechnicalScore,
): number {
  const weighted =
    trend.score * trend.weight +
    momentum.score * momentum.weight +
    volume.score * volume.weight +
    risk.score * risk.weight +
    fundamental.score * fundamental.weight +
    technical.score * technical.weight;

  const totalWeight =
    trend.weight +
    momentum.weight +
    volume.weight +
    risk.weight +
    fundamental.weight +
    technical.weight;

  return totalWeight > 0 ? Math.round(weighted / totalWeight) : 50;
}

// ─────────────────────────────────────────────────────────────
// Recommendation
// ─────────────────────────────────────────────────────────────

export function getRecommendation(score: number): Recommendation {
  if (score >= 75) return Recommendation.StrongBuy;
  if (score >= 60) return Recommendation.Buy;
  if (score >= 40) return Recommendation.Neutral;
  if (score >= 25) return Recommendation.Sell;
  return Recommendation.StrongSell;
}

// ─────────────────────────────────────────────────────────────
// Analysis Text Generator
// ─────────────────────────────────────────────────────────────

export function generateAnalysisText(
  score: number,
  indicators: IndicatorContext,
  smartMoney: SmartMoneyResult,
  patterns: CandlestickPatterns,
  trend: TrendScore,
  momentum: MomentumScore,
  volume: VolumeScore,
  risk: RiskScore,
  fundamental: FundamentalScore,
  technical: TechnicalScore,
): string {
  const recommendation = getRecommendation(score);
  const sections: string[] = [];

  sections.push(`Overall Score: ${score}/100 — ${recommendation}`);
  sections.push('');

  // Trend summary
  sections.push(`Trend (${trend.score}/100):`);
  if (trend.details.length > 0) {
    sections.push(trend.details.slice(0, 3).map((d) => `  - ${d}`).join('\n'));
  }
  sections.push('');

  // Momentum summary
  sections.push(`Momentum (${momentum.score}/100):`);
  if (momentum.details.length > 0) {
    sections.push(momentum.details.slice(0, 3).map((d) => `  - ${d}`).join('\n'));
  }
  sections.push('');

  // Volume summary
  sections.push(`Volume (${volume.score}/100):`);
  if (volume.details.length > 0) {
    sections.push(volume.details.slice(0, 2).map((d) => `  - ${d}`).join('\n'));
  }
  sections.push('');

  // Risk summary
  sections.push(`Risk (${risk.score}/100):`);
  if (risk.details.length > 0) {
    sections.push(risk.details.slice(0, 2).map((d) => `  - ${d}`).join('\n'));
  }
  sections.push('');

  // Fundamental summary
  sections.push(`Fundamental (${fundamental.score}/100):`);
  if (fundamental.details.length > 0) {
    sections.push(fundamental.details.slice(0, 3).map((d) => `  - ${d}`).join('\n'));
  }
  sections.push('');

  // Smart Money summary
  const bosCount = smartMoney.breakOfStructure.length;
  const obCount = smartMoney.orderBlocks.length;
  const fvgCount = smartMoney.fairValueGaps.filter((g) => !g.filled).length;
  if (bosCount > 0 || obCount > 0 || fvgCount > 0) {
    sections.push('Smart Money:');
    if (bosCount > 0) sections.push(`  - ${bosCount} break(s) of structure detected`);
    if (obCount > 0) {
      const unmigitated = smartMoney.orderBlocks.filter((ob) => !ob.mitigated).length;
      sections.push(`  - ${obCount} order blocks (${unmigitated} unmitigated)`);
    }
    if (fvgCount > 0) sections.push(`  - ${fvgCount} unfilled fair value gaps`);
    if (smartMoney.premiumDiscount) {
      sections.push(`  - Price in ${smartMoney.premiumDiscount.zone} zone`);
    }
    sections.push('');
  }

  // Patterns summary
  const detectedPatterns = (Object.values(patterns) as PatternDetection[]).filter((p) => p.detected);
  if (detectedPatterns.length > 0) {
    sections.push(`Candlestick Patterns (${detectedPatterns.length} detected):`);
    sections.push(detectedPatterns.map((p) => `  - ${p.name}: ${p.direction} (${(p.confidence * 100).toFixed(0)}% confidence)`).join('\n'));
    sections.push('');
  }

  // Conclusion
  sections.push('---');
  if (score >= 75) {
    sections.push('Conclusion: Strong bullish signals across multiple dimensions. Consider entering long positions with appropriate risk management.');
  } else if (score >= 60) {
    sections.push('Conclusion: Moderately bullish signals detected. A long entry may be warranted, but confirm with volume and trend strength.');
  } else if (score >= 40) {
    sections.push('Conclusion: Mixed signals — neither strongly bullish nor bearish. Best to wait for clearer directional confirmation.');
  } else if (score >= 25) {
    sections.push('Conclusion: Moderately bearish signals. Consider reducing exposure or waiting for trend reversal confirmation.');
  } else {
    sections.push('Conclusion: Strong bearish signals across multiple dimensions. Consider exiting long positions or evaluating short opportunities.');
  }

  return sections.join('\n');
}

// ─────────────────────────────────────────────────────────────
// Master scoring function
// ─────────────────────────────────────────────────────────────

export function runFullScoring(
  candles: OHLCCandle[],
  indicators: IndicatorContext,
  smartMoney: SmartMoneyResult,
  patterns: CandlestickPatterns,
  stockInfo: StockInfo | null,
): OverallScore {
  const trend = calculateTrendScore(indicators, smartMoney, candles);
  const momentum = calculateMomentumScore(indicators);
  const volume = calculateVolumeScore(indicators, candles);
  const risk = calculateRiskScore(indicators, candles);
  const fundamental = calculateFundamentalScore(stockInfo);
  const technical = calculateTechnicalScore(patterns, indicators);

  const value = calculateOverallScore(trend, momentum, volume, risk, fundamental, technical);
  const recommendation = getRecommendation(value);

  const analysisText = generateAnalysisText(
    value,
    indicators,
    smartMoney,
    patterns,
    trend,
    momentum,
    volume,
    risk,
    fundamental,
    technical,
  );

  return {
    value,
    recommendation,
    trend,
    momentum,
    volume,
    risk,
    fundamental,
    technical,
    analysisText,
  };
}
