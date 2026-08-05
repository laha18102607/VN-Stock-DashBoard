import { NextRequest } from "next/server";
import { z } from "zod";
import { fetchWithTimeout, jsonResponse, errorResponse } from "@/lib/fetch";
import type { StockInfo, MarketData } from "@/lib/types";

const querySchema = z.object({
  ticker: z
    .string()
    .min(1, "Ticker is required")
    .max(10)
    .transform((v) => v.toUpperCase()),
});

// ---------- CafeF source ----------

async function fetchInfoFromCafeF(
  ticker: string
): Promise<{ info: Partial<StockInfo>; market: Partial<MarketData> } | null> {
  try {
    // Fetch the company profile page
    const profileUrl = `https://s.cafef.vn/Ajax/PageNew/DataHistory/CompanyProfile.ashx?Symbol=${ticker}`;
    const profileRes = await fetchWithTimeout(profileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Referer: "https://s.cafef.vn/",
      },
      timeout: 10000,
    });

    let companyName = "";
    let industry = "";

    if (profileRes.ok) {
      try {
        const profileData = await profileRes.json();
        companyName = profileData?.CompanyName || profileData?.TenCongTy || "";
        industry = profileData?.Industry || profileData?.Nganh || "";
      } catch {
        // Parse from HTML if JSON fails
        const text = await profileRes.text();
        const nameMatch = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        companyName = nameMatch?.[1]?.replace(/<[^>]*>/g, "").trim() || "";
      }
    }

    // Fetch current quote / price data
    const quoteUrl = `https://s.cafef.vn/Ajax/PageNew/DataHistory/PriceHistory.ashx`;
    const quoteBody = new URLSearchParams({
      Symbol: ticker,
      StartDate: getTodayString(),
      EndDate: getTodayString(),
      PageIndex: "1",
      PageSize: "1",
    });

    const quoteRes = await fetchWithTimeout(quoteUrl, {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Referer: "https://s.cafef.vn/",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: quoteBody.toString(),
      timeout: 10000,
    });

    let price = 0;
    let open = 0;
    let high = 0;
    let low = 0;
    let volume = 0;

    if (quoteRes.ok) {
      try {
        const quoteData = await quoteRes.json();
        const rows = quoteData?.Data?.Data;
        if (rows && rows.length > 0) {
          const row = rows[0];
          price = parseNum(row["Gia Dong Cua"] ?? row.GiaDongCua ?? row.Close);
          open = parseNum(row["Gia Mo"] ?? row.GiaMo ?? row.Open);
          high = parseNum(row["Gia Cao Nhat"] ?? row.GiaCaoNhat ?? row.High);
          low = parseNum(row["Gia Thap Nhat"] ?? row.GiaThapNhat ?? row.Low);
          volume = parseNum(row["Khoi Luong"] ?? row.KhoiLuong ?? row.Volume);
        }
      } catch {
        // Continue with defaults
      }
    }

    return {
      info: {
        name: companyName || ticker,
        industry: industry || "Unknown",
      },
      market: {
        price,
        open,
        high,
        low,
        close: price,
        volume,
      },
    };
  } catch {
    return null;
  }
}

// ---------- Yahoo Finance source ----------

async function fetchInfoFromYahoo(
  ticker: string
): Promise<{ info: Partial<StockInfo>; market: Partial<MarketData> } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.VN?range=5d&interval=1d`;

    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    if (!response.ok) return null;

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const quote = result.indicators?.quote?.[0];

    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // Get latest day data
    const timestamps = result.timestamp || [];
    let open = 0;
    let high = 0;
    let low = 0;
    let volume = 0;

    if (quote && timestamps.length > 0) {
      const lastIdx = timestamps.length - 1;
      open = quote.open?.[lastIdx] || 0;
      high = quote.high?.[lastIdx] || 0;
      low = quote.low?.[lastIdx] || 0;
      volume = quote.volume?.[lastIdx] || 0;
    }

    // Also try to get the quote summary for more info
    const quoteSummaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}.VN?modules=summaryDetail,defaultKeyStatistics,financialData`;

    let marketCap = 0;
    let pe = 0;
    let pb = 0;
    let eps = 0;
    let beta = 0;
    let high52w = 0;
    let low52w = 0;
    let dividend = 0;
    let roe = 0;
    let roa = 0;
    let bookValue = 0;

    try {
      const summaryRes = await fetchWithTimeout(quoteSummaryUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
        timeout: 10000,
      });

      if (summaryRes.ok) {
        const summaryJson = await summaryRes.json();
        const modules = summaryJson?.quoteSummary?.result?.[0];

        if (modules) {
          const sd = modules.summaryDetail || {};
          const ks = modules.defaultKeyStatistics || {};
          const fd = modules.financialData || {};

          marketCap = sd.marketCap?.raw || 0;
          pe = sd.trailingPE?.raw || sd.forwardPE?.raw || 0;
          high52w = sd.fiftyTwoWeekHigh?.raw || 0;
          low52w = sd.fiftyTwoWeekLow?.raw || 0;
          dividend = sd.dividendYield?.raw ? sd.dividendYield.raw * 100 : 0;

          eps = ks.trailingEps?.raw || 0;
          beta = ks.beta?.raw || 0;
          pb = ks.priceToBook?.raw || 0;
          bookValue = ks.bookValue?.raw || 0;

          roe = fd.returnOnEquity?.raw ? fd.returnOnEquity.raw * 100 : 0;
          roa = fd.returnOnAssets?.raw ? fd.returnOnAssets.raw * 100 : 0;
        }
      }
    } catch {
      // Continue with partial data
    }

    return {
      info: {
        name: meta.shortName || meta.longName || meta.symbol || ticker,
        industry: "N/A",
        marketCap,
        PE: pe,
        PB: pb,
        EPS: eps,
        ROE: roe,
        ROA: roa,
        bookValue,
        beta,
      },
      market: {
        price,
        open,
        high,
        low,
        close: price,
        volume,
        high52w,
        low52w,
        dividend,
        change,
        changePercent,
      },
    };
  } catch {
    return null;
  }
}

// ---------- Helpers ----------

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function parseNum(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").replace(/\./g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// ---------- Route handler ----------

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.safeParse(params);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const { ticker } = parsed.data;

    // Multi-source: CafeF first, Yahoo fallback
    let result = await fetchInfoFromCafeF(ticker);

    if (!result) {
      result = await fetchInfoFromYahoo(ticker);
    }

    if (!result) {
      return errorResponse(
        `No company information found for ${ticker}. The ticker may be invalid or data sources may be unavailable.`,
        404
      );
    }

    // Fill in defaults
    const info: StockInfo = {
      name: result.info.name || ticker,
      industry: result.info.industry || "N/A",
      marketCap: result.info.marketCap || 0,
      PE: result.info.PE || 0,
      PB: result.info.PB || 0,
      EPS: result.info.EPS || 0,
      ROE: result.info.ROE || 0,
      ROA: result.info.ROA || 0,
      bookValue: result.info.bookValue || 0,
      beta: result.info.beta || 0,
    };

    const market: MarketData = {
      price: result.market.price || 0,
      open: result.market.open || 0,
      high: result.market.high || 0,
      low: result.market.low || 0,
      close: result.market.close || result.market.price || 0,
      volume: result.market.volume || 0,
      high52w: result.market.high52w || 0,
      low52w: result.market.low52w || 0,
      dividend: result.market.dividend || 0,
      change: result.market.change || 0,
      changePercent: result.market.changePercent || 0,
    };

    return jsonResponse({ info, market });
  } catch (error) {
    console.error("[stock/info] Error:", error);
    return errorResponse("Internal server error while fetching stock info", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
