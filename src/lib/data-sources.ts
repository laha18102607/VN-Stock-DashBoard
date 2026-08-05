import type { OHLCCandle, StockInfo, MarketData, NewsItem } from './types';

// ─────────────────────────────────────────────────────────────
// DataSource interface
// ─────────────────────────────────────────────────────────────

export interface DataSource {
  name: string;
  getPriceHistory(ticker: string, days?: number): Promise<OHLCCandle[]>;
  getCompanyInfo(ticker: string): Promise<StockInfo | null>;
  getMarketData(ticker: string): Promise<MarketData | null>;
  searchTicker(query: string): Promise<{ ticker: string; name: string }[]>;
  getNews(ticker: string, limit?: number): Promise<NewsItem[]>;
}

// ─────────────────────────────────────────────────────────────
// Common helpers
// ─────────────────────────────────────────────────────────────

const COMMON_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
};

function parseDate(dateStr: string): number {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime() / 1000;
  }
  return new Date(dateStr).getTime() / 1000;
}

function safeNumber(val: any, fallback = 0): number {
  const n = Number(val);
  return isNaN(n) || val === null || val === undefined ? fallback : n;
}

// ─────────────────────────────────────────────────────────────
// CafeF Source (primary)
// ─────────────────────────────────────────────────────────────

export class CafeFSource implements DataSource {
  name = 'CafeF';

  private headers(): Record<string, string> {
    return {
      ...COMMON_HEADERS,
      Referer: 'https://s.cafef.vn/',
      Origin: 'https://s.cafef.vn',
    };
  }

  async getPriceHistory(ticker: string, days = 365): Promise<OHLCCandle[]> {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    const url = 'https://s.cafef.vn/Ajax/PageNew/DataHistory/PriceHistory.ashx';
    const body = new URLSearchParams({
      Symbol: ticker.toUpperCase(),
      StartDate: fmt(fromDate),
      EndDate: fmt(toDate),
      PageIndex: '1',
      PageSize: String(days + 50),
    });

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!resp.ok) throw new Error(`CafeF price history failed: ${resp.status}`);

    const json = await resp.json();
    const rows = json?.Data?.Data ?? [];

    return rows.map((r: any) => ({
      time: parseDate(r.Ngay),
      open: safeNumber(r.GiaMoCua),
      high: safeNumber(r.GiaCaoNhat),
      low: safeNumber(r.GiaThapNhat),
      close: safeNumber(r.GiaDongCua),
      volume: safeNumber(r.KhoiLuongKhopLenh),
    })).reverse();
  }

  async getCompanyInfo(ticker: string): Promise<StockInfo | null> {
    const upper = ticker.toUpperCase();
    const url = `https://s.cafef.vn/Ajax/PageNew/DataHistory/CompanyInfo.ashx?Symbol=${upper}&Type=1`;

    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`CafeF company info failed: ${resp.status}`);

    const json = await resp.json();
    const d = json?.Data ?? {};

    return {
      ticker: upper,
      name: d.TenCongTy ?? upper,
      industry: d.Nganh ?? '',
      marketCap: safeNumber(d.VonHoaThiTruong) * 1e6,
      pe: safeNumber(d.PE),
      pb: safeNumber(d.PB),
      eps: safeNumber(d.EPS),
      roe: safeNumber(d.ROE),
      roa: safeNumber(d.ROA),
      bookValue: safeNumber(d.GiaTriSoHuu),
      beta: safeNumber(d.Beta),
    };
  }

  async getMarketData(ticker: string): Promise<MarketData | null> {
    const upper = ticker.toUpperCase();
    const candles = await this.getPriceHistory(upper, 365);
    if (candles.length === 0) return null;

    const latest = candles[candles.length - 1];
    const prev = candles.length > 1 ? candles[candles.length - 2] : latest;

    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    const change = latest.close - prev.close;
    const changePercent = prev.close !== 0 ? (change / prev.close) * 100 : 0;

    return {
      ticker: upper,
      price: latest.close,
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
      volume: latest.volume,
      high52w: Math.max(...highs),
      low52w: Math.min(...lows),
      dividend: 0,
      change,
      changePercent,
    };
  }

  async searchTicker(query: string): Promise<{ ticker: string; name: string }[]> {
    const url = `https://s.cafef.vn/Ajax/PageNew/DataHistory/SymbolSearch.ashx?Keyword=${encodeURIComponent(query)}`;
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`CafeF search failed: ${resp.status}`);

    const json = await resp.json();
    const results = json?.Data ?? [];
    return results.map((r: any) => ({
      ticker: r.Symbol ?? r.MaChungKhoan ?? '',
      name: r.TenChungKhoan ?? r.CompanyName ?? '',
    }));
  }

  async getNews(ticker: string, limit = 20): Promise<NewsItem[]> {
    const upper = ticker.toUpperCase();
    const url = `https://s.cafef.vn/Ajax/PageNew/DataHistory/BusinessNews.ashx?Symbol=${upper}&PageIndex=1&PageSize=${limit}`;
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`CafeF news failed: ${resp.status}`);

    const json = await resp.json();
    const articles = json?.Data ?? [];
    return articles.map((a: any, idx: number) => ({
      id: `cafef-${upper}-${idx}`,
      title: a.Title ?? '',
      summary: a.Summary ?? a.Description ?? '',
      url: a.Url ?? '',
      source: 'CafeF',
      publishedAt: parseDate(a.Date ?? ''),
      sentiment: 'neutral' as const,
      sentimentScore: 0,
      tickers: [upper],
    }));
  }
}

// ─────────────────────────────────────────────────────────────
// Vietstock Source (fallback)
// ─────────────────────────────────────────────────────────────

export class VietstockSource implements DataSource {
  name = 'Vietstock';

  private headers(): Record<string, string> {
    return {
      ...COMMON_HEADERS,
      Referer: 'https://finance.vietstock.vn/',
      Origin: 'https://finance.vietstock.vn',
    };
  }

  async getPriceHistory(ticker: string, days = 365): Promise<OHLCCandle[]> {
    const upper = ticker.toUpperCase();
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

    const url = 'https://finance.vietstock.vn/data/ExportTradingResult';
    const body = new URLSearchParams({
      Code: upper,
      OrderBy: 'TradingDate',
      OrderDirection: 'ASC',
      FromDate: fmt(fromDate),
      ToDate: fmt(toDate),
      ExportType: 'json',
    });

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!resp.ok) throw new Error(`Vietstock price history failed: ${resp.status}`);

    const json = await resp.json();
    const rows = Array.isArray(json) ? json : json?.data ?? [];

    return rows.map((r: any) => ({
      time: parseDate(r.TradingDate ?? r.Date ?? ''),
      open: safeNumber(r.OpenPrice ?? r.Open),
      high: safeNumber(r.HighPrice ?? r.High),
      low: safeNumber(r.LowPrice ?? r.Low),
      close: safeNumber(r.ClosePrice ?? r.Close),
      volume: safeNumber(r.TotalVol ?? r.Volume),
    }));
  }

  async getCompanyInfo(ticker: string): Promise<StockInfo | null> {
    const upper = ticker.toUpperCase();
    const url = `https://finance.vietstock.vn/data/CompanyProfile?Code=${upper}`;
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Vietstock company info failed: ${resp.status}`);

    const json = await resp.json();
    const d = json ?? {};

    return {
      ticker: upper,
      name: d.CompanyName ?? d.Name ?? upper,
      industry: d.Industry ?? '',
      marketCap: safeNumber(d.MarketCap) * 1e6,
      pe: safeNumber(d.PERatio ?? d.PE),
      pb: safeNumber(d.PBRatio ?? d.PB),
      eps: safeNumber(d.EPS),
      roe: safeNumber(d.ROE),
      roa: safeNumber(d.ROA),
      bookValue: safeNumber(d.BookValue),
      beta: safeNumber(d.Beta),
    };
  }

  async getMarketData(ticker: string): Promise<MarketData | null> {
    const upper = ticker.toUpperCase();
    const candles = await this.getPriceHistory(upper, 365);
    if (candles.length === 0) return null;

    const latest = candles[candles.length - 1];
    const prev = candles.length > 1 ? candles[candles.length - 2] : latest;

    const change = latest.close - prev.close;
    const changePercent = prev.close !== 0 ? (change / prev.close) * 100 : 0;

    return {
      ticker: upper,
      price: latest.close,
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
      volume: latest.volume,
      high52w: Math.max(...candles.map((c) => c.high)),
      low52w: Math.min(...candles.map((c) => c.low)),
      dividend: 0,
      change,
      changePercent,
    };
  }

  async searchTicker(query: string): Promise<{ ticker: string; name: string }[]> {
    const url = `https://finance.vietstock.vn/data/SuggestSearch?keyword=${encodeURIComponent(query)}&type=1`;
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Vietstock search failed: ${resp.status}`);

    const json = await resp.json();
    const results = Array.isArray(json) ? json : json?.data ?? [];
    return results.map((r: any) => ({
      ticker: r.Code ?? r.Symbol ?? '',
      name: r.CompanyName ?? r.Name ?? '',
    }));
  }

  async getNews(ticker: string, limit = 20): Promise<NewsItem[]> {
    const upper = ticker.toUpperCase();
    const url = `https://finance.vietstock.vn/data/BusinessNews?Code=${upper}&Page=1&PageSize=${limit}`;
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Vietstock news failed: ${resp.status}`);

    const json = await resp.json();
    const articles = Array.isArray(json) ? json : json?.data ?? [];
    return articles.slice(0, limit).map((a: any, idx: number) => ({
      id: `vietstock-${upper}-${idx}`,
      title: a.Title ?? '',
      summary: a.Sapo ?? a.Summary ?? '',
      url: a.Url ?? a.Link ?? '',
      source: 'Vietstock',
      publishedAt: parseDate(a.PublishedDate ?? a.Date ?? ''),
      sentiment: 'neutral' as const,
      sentimentScore: 0,
      tickers: [upper],
    }));
  }
}

// ─────────────────────────────────────────────────────────────
// Yahoo Finance Source (fallback)
// ─────────────────────────────────────────────────────────────

export class YahooSource implements DataSource {
  name = 'Yahoo';

  private headers(): Record<string, string> {
    return {
      ...COMMON_HEADERS,
      Referer: 'https://finance.yahoo.com/',
      Origin: 'https://finance.yahoo.com',
    };
  }

  async getPriceHistory(ticker: string, days = 365): Promise<OHLCCandle[]> {
    const symbol = `${ticker.toUpperCase()}.VN`;
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - days * 86400;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;

    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Yahoo price history failed: ${resp.status}`);

    const json = await resp.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('Yahoo: no chart result');

    const timestamps: number[] = result.timestamp ?? [];
    const quotes = result.indicators?.quote?.[0] ?? {};
    const opens: number[] = quotes.open ?? [];
    const highs: number[] = quotes.high ?? [];
    const lows: number[] = quotes.low ?? [];
    const closes: number[] = quotes.close ?? [];
    const volumes: number[] = quotes.volume ?? [];

    const candles: OHLCCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (
        opens[i] == null ||
        highs[i] == null ||
        lows[i] == null ||
        closes[i] == null ||
        volumes[i] == null
      ) {
        continue;
      }
      candles.push({
        time: timestamps[i],
        open: opens[i],
        high: highs[i],
        low: lows[i],
        close: closes[i],
        volume: volumes[i],
      });
    }

    return candles;
  }

  async getCompanyInfo(ticker: string): Promise<StockInfo | null> {
    const symbol = `${ticker.toUpperCase()}.VN`;
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,defaultKeyStatistics,financialData`;

    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Yahoo company info failed: ${resp.status}`);

    const json = await resp.json();
    const modules = json?.quoteSummary?.result?.[0];
    if (!modules) throw new Error('Yahoo: no quoteSummary result');

    const summary = modules.summaryDetail ?? {};
    const stats = modules.defaultKeyStatistics ?? {};
    const financial = modules.financialData ?? {};

    const get = (obj: any, key: string, fallback = 0) => safeNumber(obj?.[key]?.raw, fallback);

    return {
      ticker: ticker.toUpperCase(),
      name: summary.shortName ?? summary.longName ?? ticker.toUpperCase(),
      industry: summary.industry ?? '',
      marketCap: get(summary, 'marketCap'),
      pe: get(summary, 'trailingPE'),
      pb: get(stats, 'priceToBook'),
      eps: get(summary, 'trailingEps'),
      roe: get(financial, 'returnOnEquity'),
      roa: get(financial, 'returnOnAssets'),
      bookValue: get(stats, 'bookValue'),
      beta: get(stats, 'beta'),
    };
  }

  async getMarketData(ticker: string): Promise<MarketData | null> {
    const symbol = `${ticker.toUpperCase()}.VN`;
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;

    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Yahoo market data failed: ${resp.status}`);

    const json = await resp.json();
    const q = json?.quoteResponse?.result?.[0];
    if (!q) throw new Error('Yahoo: no quote result');

    return {
      ticker: ticker.toUpperCase(),
      price: safeNumber(q.regularMarketPrice),
      open: safeNumber(q.regularMarketOpen),
      high: safeNumber(q.regularMarketDayHigh),
      low: safeNumber(q.regularMarketDayLow),
      close: safeNumber(q.regularMarketPrice),
      volume: safeNumber(q.regularMarketVolume),
      high52w: safeNumber(q.fiftyTwoWeekHigh),
      low52w: safeNumber(q.fiftyTwoWeekLow),
      dividend: safeNumber(q.trailingAnnualDividendYield),
      change: safeNumber(q.regularMarketChange),
      changePercent: safeNumber(q.regularMarketChangePercent),
    };
  }

  async searchTicker(query: string): Promise<{ ticker: string; name: string }[]> {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&region=VN`;
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Yahoo search failed: ${resp.status}`);

    const json = await resp.json();
    const quotes = json?.quotes ?? [];
    return quotes
      .filter((q: any) => q.exchange === 'VSE' || q.symbol?.endsWith('.VN'))
      .map((q: any) => ({
        ticker: (q.symbol ?? '').replace('.VN', ''),
        name: q.shortname ?? q.longname ?? '',
      }));
  }

  async getNews(ticker: string, limit = 20): Promise<NewsItem[]> {
    const symbol = `${ticker.toUpperCase()}.VN`;
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=${limit}`;
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Yahoo news failed: ${resp.status}`);

    const json = await resp.json();
    const articles = json?.news ?? [];
    return articles.slice(0, limit).map((a: any, idx: number) => ({
      id: `yahoo-${ticker}-${idx}`,
      title: a.title ?? '',
      summary: a.summary ?? '',
      url: a.link ?? '',
      source: a.publisher ?? 'Yahoo Finance',
      publishedAt: a.providerPublishTime ?? Date.now() / 1000,
      sentiment: 'neutral' as const,
      sentimentScore: 0,
      tickers: [ticker.toUpperCase()],
    }));
  }
}

// ─────────────────────────────────────────────────────────────
// DataFetcher: orchestrates sources with fallback
// ─────────────────────────────────────────────────────────────

export class DataFetcher {
  private sources: DataSource[];

  constructor(sources?: DataSource[]) {
    this.sources = sources ?? [new CafeFSource(), new VietstockSource(), new YahooSource()];
  }

  private async tryEach<T>(
    fn: (source: DataSource) => Promise<T>,
    label: string,
  ): Promise<T> {
    const errors: Error[] = [];
    for (const source of this.sources) {
      try {
        return await fn(source);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(new Error(`[${source.name}] ${label}: ${message}`));
      }
    }
    throw new Error(
      `All sources failed for ${label}:\n${errors.map((e) => e.message).join('\n')}`,
    );
  }

  async getPriceHistory(ticker: string, days?: number): Promise<OHLCCandle[]> {
    return this.tryEach((s) => s.getPriceHistory(ticker, days), `getPriceHistory(${ticker})`);
  }

  async getCompanyInfo(ticker: string): Promise<StockInfo | null> {
    return this.tryEach((s) => s.getCompanyInfo(ticker), `getCompanyInfo(${ticker})`);
  }

  async getMarketData(ticker: string): Promise<MarketData | null> {
    return this.tryEach((s) => s.getMarketData(ticker), `getMarketData(${ticker})`);
  }

  async searchTicker(query: string): Promise<{ ticker: string; name: string }[]> {
    return this.tryEach((s) => s.searchTicker(query), `searchTicker(${query})`);
  }

  async getNews(ticker: string, limit?: number): Promise<NewsItem[]> {
    return this.tryEach((s) => s.getNews(ticker, limit), `getNews(${ticker})`);
  }

  /**
   * Run a full analysis fetch: price history, company info, market data, and news.
   * Each item independently falls back across sources.
   */
  async getFullAnalysis(ticker: string, days = 365) {
    const [candles, stockInfo, marketData, news] = await Promise.allSettled([
      this.getPriceHistory(ticker, days),
      this.getCompanyInfo(ticker),
      this.getMarketData(ticker),
      this.getNews(ticker),
    ]);

    return {
      candles: candles.status === 'fulfilled' ? candles.value : [],
      stockInfo: stockInfo.status === 'fulfilled' ? stockInfo.value : null,
      marketData: marketData.status === 'fulfilled' ? marketData.value : null,
      news: news.status === 'fulfilled' ? news.value : [],
    };
  }
}

/** Singleton fetcher instance with all sources configured. */
export const fetcher = new DataFetcher();
