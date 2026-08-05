// ─────────────────────────────────────────────────────────────
// OHLC Candle Data
// ─────────────────────────────────────────────────────────────

export interface OHLCCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─────────────────────────────────────────────────────────────
// Stock Fundamental Info
// ─────────────────────────────────────────────────────────────

export interface StockInfo {
  ticker: string;
  name: string;
  industry: string;
  marketCap: number;
  pe: number;
  pb: number;
  eps: number;
  roe: number;
  roa: number;
  bookValue: number;
  beta: number;
}

// ─────────────────────────────────────────────────────────────
// Market Data
// ─────────────────────────────────────────────────────────────

export interface MarketData {
  ticker: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  high52w: number;
  low52w: number;
  dividend: number;
  change: number;
  changePercent: number;
}

// ─────────────────────────────────────────────────────────────
// Technical Indicator Result Types
// ─────────────────────────────────────────────────────────────

export interface SMAData {
  name: 'SMA';
  values: number[];
  period: number;
}

export interface EMAData {
  name: 'EMA';
  values: number[];
  period: number;
}

export interface VWMAData {
  name: 'VWMA';
  values: number[];
  period: number;
}

export interface RSIData {
  name: 'RSI';
  values: number[];
  period: number;
}

export interface MACDPoint {
  macdLine: number;
  signalLine: number;
  histogram: number;
}

export interface MACDData {
  name: 'MACD';
  values: MACDPoint[];
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export interface BollingerBandPoint {
  upper: number;
  middle: number;
  lower: number;
}

export interface BollingerBandsData {
  name: 'BollingerBands';
  values: BollingerBandPoint[];
  period: number;
  stdDev: number;
}

export interface ATRData {
  name: 'ATR';
  values: number[];
  period: number;
}

export interface ADXPoint {
  adx: number;
  plusDI: number;
  minusDI: number;
}

export interface ADXData {
  name: 'ADX';
  values: ADXPoint[];
  period: number;
}

export interface OBVData {
  name: 'OBV';
  values: number[];
}

export interface StochasticPoint {
  k: number;
  d: number;
}

export interface StochasticData {
  name: 'Stochastic';
  values: StochasticPoint[];
  kPeriod: number;
  dPeriod: number;
}

export interface CCIData {
  name: 'CCI';
  values: number[];
  period: number;
}

export interface IchimokuPoint {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
  chikou: number;
}

export interface IchimokuData {
  name: 'Ichimoku';
  values: IchimokuPoint[];
}

export interface ParabolicSARPoint {
  sar: number;
  trend: 'up' | 'down';
}

export interface ParabolicSARData {
  name: 'ParabolicSAR';
  values: ParabolicSARPoint[];
  af: number;
  maxAf: number;
}

export interface SupertrendPoint {
  value: number;
  trend: 'up' | 'down';
}

export interface SupertrendData {
  name: 'Supertrend';
  values: SupertrendPoint[];
  period: number;
  multiplier: number;
}

export interface PivotPointsData {
  name: 'PivotPoints';
  pp: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface FibonacciLevel {
  level: number;
  price: number;
  label: string;
}

export interface FibonacciData {
  name: 'Fibonacci';
  values: FibonacciLevel[];
}

export interface DonchianChannelPoint {
  upper: number;
  middle: number;
  lower: number;
}

export interface DonchianChannelData {
  name: 'DonchianChannel';
  values: DonchianChannelPoint[];
  period: number;
}

export interface KeltnerChannelPoint {
  upper: number;
  middle: number;
  lower: number;
}

export interface KeltnerChannelData {
  name: 'KeltnerChannel';
  values: KeltnerChannelPoint[];
  period: number;
  atrMultiplier: number;
}

export interface MFIData {
  name: 'MFI';
  values: number[];
  period: number;
}

export interface VolumeProfileBin {
  price: number;
  volume: number;
}

export interface VolumeProfileData {
  name: 'VolumeProfile';
  values: VolumeProfileBin[];
  numBins: number;
}

export type IndicatorData =
  | SMAData
  | EMAData
  | VWMAData
  | RSIData
  | MACDData
  | BollingerBandsData
  | ATRData
  | ADXData
  | OBVData
  | StochasticData
  | CCIData
  | IchimokuData
  | ParabolicSARData
  | SupertrendData
  | PivotPointsData
  | FibonacciData
  | DonchianChannelData
  | KeltnerChannelData
  | MFIData
  | VolumeProfileData;

export interface AllIndicators {
  sma: SMAData;
  ema: EMAData;
  vwma: VWMAData;
  rsi: RSIData;
  macd: MACDData;
  bollingerBands: BollingerBandsData;
  atr: ATRData;
  adx: ADXData;
  obv: OBVData;
  stochastic: StochasticData;
  cci: CCIData;
  ichimoku: IchimokuData;
  parabolicSAR: ParabolicSARData;
  supertrend: SupertrendData;
  pivotPoints: PivotPointsData;
  fibonacci: FibonacciData;
  donchianChannel: DonchianChannelData;
  keltnerChannel: KeltnerChannelData;
  mfi: MFIData;
  volumeProfile: VolumeProfileData;
}

// ─────────────────────────────────────────────────────────────
// Smart Money Concepts
// ─────────────────────────────────────────────────────────────

export type SmartMoneyDirection = 'bullish' | 'bearish';

export interface SmartMoneyDetection {
  index: number;
  type: string;
  direction: SmartMoneyDirection;
  price: number;
  confidence: number;
  explanation: string;
}

export interface BreakOfStructure extends SmartMoneyDetection {
  type: 'BOS';
  brokenLevel: number;
}

export interface ChangeOfCharacter extends SmartMoneyDetection {
  type: 'CHoCH';
  previousTrend: SmartMoneyDirection;
}

export interface LiquiditySweep extends SmartMoneyDetection {
  type: 'LiquiditySweep';
  sweptLevel: number;
}

export interface OrderBlock {
  index: number;
  type: 'OrderBlock';
  direction: SmartMoneyDirection;
  high: number;
  low: number;
  price: number;
  confidence: number;
  explanation: string;
  mitigated: boolean;
}

export interface FairValueGap extends SmartMoneyDetection {
  type: 'FairValueGap';
  gapHigh: number;
  gapLow: number;
  filled: boolean;
}

export interface EqualHighLow extends SmartMoneyDetection {
  type: 'EqualHighLow';
  equalLevel: number;
  count: number;
  isHigh: boolean;
}

export interface PremiumDiscount extends SmartMoneyDetection {
  type: 'PremiumDiscount';
  zone: 'premium' | 'discount' | 'equilibrium';
  rangeHigh: number;
  rangeLow: number;
  midpoint: number;
}

export interface Mitigation extends SmartMoneyDetection {
  type: 'Mitigation';
  orderBlockIndex: number;
}

export interface BreakerBlock extends SmartMoneyDetection {
  type: 'BreakerBlock';
  originalOrderBlockIndex: number;
}

export interface SmartMoneyResult {
  breakOfStructure: BreakOfStructure[];
  changeOfCharacter: ChangeOfCharacter[];
  liquiditySweep: LiquiditySweep[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  equalHighsLows: EqualHighLow[];
  premiumDiscount: PremiumDiscount | null;
  mitigations: Mitigation[];
  breakerBlocks: BreakerBlock[];
}

// ─────────────────────────────────────────────────────────────
// Candlestick Patterns
// ─────────────────────────────────────────────────────────────

export type PatternDirection = 'bullish' | 'bearish' | 'neutral';

export interface PatternDetection {
  name: string;
  detected: boolean;
  index: number;
  direction: PatternDirection;
  confidence: number;
  explanation: string;
}

export interface CandlestickPatterns {
  doji: PatternDetection;
  hammer: PatternDetection;
  shootingStar: PatternDetection;
  morningStar: PatternDetection;
  eveningStar: PatternDetection;
  bullishEngulfing: PatternDetection;
  bearishEngulfing: PatternDetection;
  harami: PatternDetection;
  piercingPattern: PatternDetection;
  darkCloudCover: PatternDetection;
  threeWhiteSoldiers: PatternDetection;
  threeBlackCrows: PatternDetection;
  marubozu: PatternDetection;
  spinningTop: PatternDetection;
}

// ─────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  score: number;
  details: string[];
}

export interface TrendScore extends ScoreBreakdown {
  name: 'Trend';
  weight: number;
}

export interface MomentumScore extends ScoreBreakdown {
  name: 'Momentum';
  weight: number;
}

export interface VolumeScore extends ScoreBreakdown {
  name: 'Volume';
  weight: number;
}

export interface RiskScore extends ScoreBreakdown {
  name: 'Risk';
  weight: number;
}

export interface FundamentalScore extends ScoreBreakdown {
  name: 'Fundamental';
  weight: number;
}

export interface TechnicalScore extends ScoreBreakdown {
  name: 'Technical';
  weight: number;
}

export enum Recommendation {
  StrongBuy = 'Strong Buy',
  Buy = 'Buy',
  Neutral = 'Neutral',
  Sell = 'Sell',
  StrongSell = 'Strong Sell',
}

export interface OverallScore {
  value: number;
  recommendation: Recommendation;
  trend: TrendScore;
  momentum: MomentumScore;
  volume: VolumeScore;
  risk: RiskScore;
  fundamental: FundamentalScore;
  technical: TechnicalScore;
  analysisText: string;
}

// ─────────────────────────────────────────────────────────────
// News
// ─────────────────────────────────────────────────────────────

export type NewsSentiment = 'positive' | 'negative' | 'neutral';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: number;
  sentiment: NewsSentiment;
  sentimentScore: number;
  tickers: string[];
}

// ─────────────────────────────────────────────────────────────
// Analysis Result
// ─────────────────────────────────────────────────────────────

export interface AnalysisResult {
  ticker: string;
  timestamp: number;
  marketData: MarketData;
  stockInfo: StockInfo | null;
  candles: OHLCCandle[];
  indicators: AllIndicators;
  smartMoney: SmartMoneyResult;
  patterns: CandlestickPatterns;
  score: OverallScore;
  news: NewsItem[];
}

// ─────────────────────────────────────────────────────────────
// Watchlist
// ─────────────────────────────────────────────────────────────

export interface WatchlistItem {
  id: string;
  userId: string;
  ticker: string;
  addedAt: number;
  notes: string;
  targetPrice: number | null;
  alertAbove: number | null;
  alertBelow: number | null;
}

// ─────────────────────────────────────────────────────────────
// User / Auth
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
  watchlists: string[];
}

export interface JWTPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}
