import { NextRequest } from "next/server";
import { fetchWithTimeout, jsonResponse, errorResponse } from "@/lib/fetch";
import type { MarketIndex, MarketMover } from "@/lib/types";

// Top VN tickers for gainers/losers tracking
const TRACKED_TICKERS = [
  "VCB", "VIC", "VHM", "VNM", "MSN", "FPT", "MWG", "HPG", "GAS", "PLX",
  "SAB", "BID", "CTG", "TCB", "VPB", "MBB", "ACB", "TPB", "HDB", "STB",
  "SSI", "VCI", "HCM", "VJC", "NVL", "POW", "BVH", "PNJ", "DIG", "DXG",
  "KDH", "NLG", "PDR", "REE", "DPM", "DCM", "VHC", "HSG", "NKG", "HAG",
  "CTD", "HBC", "VCG", "GMD", "BMP", "NTP", "DGC", "SHB", "PVS", "VND",
  "VOS", "FRT", "CMG", "GEX", "BCG", "FIT", "HDG", "TCH", "SCR", "QCG",
  "SBT", "PAN", "KDC", "VGC", "YEG", "HVN", "PVD", "PVT", "PET", "PGD",
  "NT2", "DHC", "APH", "AAA", "TLH", "POM", "BMI", "PGI", "VNR", "HAH",
  "VSC", "STG", "VTO", "CSV", "LAS", "CVT", "HT1", "CLL", "SAS", "VTP",
];

// ---------- Yahoo Finance for indices ----------

async function fetchIndexData(): Promise<MarketIndex[]> {
  const indexSymbols: { symbol: string; name: string }[] = [
    { symbol: "^VNINDEX", name: "VNINDEX" },
    { symbol: "^HNXIndex", name: "HNX-Index" },
  ];

  const indices: MarketIndex[] = [];

  // Try fetching all at once
  const symbols = indexSymbols.map((i) => i.symbol).join(",");
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    if (response.ok) {
      const json = await response.json();
      const quotes = json?.quoteResponse?.result || [];

      for (const quote of quotes) {
        indices.push({
          name: quote.shortName || quote.symbol || "Unknown",
          value: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          volume: quote.regularMarketVolume || 0,
        });
      }
    }
  } catch {
    // Fallback: try chart endpoint for each index
    for (const idx of indexSymbols) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}?range=5d&interval=1d`;
        const res = await fetchWithTimeout(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          },
          timeout: 8000,
        });

        if (res.ok) {
          const json = await res.json();
          const meta = json?.chart?.result?.[0]?.meta;
          if (meta) {
            const price = meta.regularMarketPrice || 0;
            const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
            const change = price - prevClose;
            const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

            indices.push({
              name: idx.name,
              value: price,
              change,
              changePercent,
              volume: 0,
            });
          }
        }
      } catch {
        // Add placeholder
        indices.push({
          name: idx.name,
          value: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
        });
      }
    }
  }

  // Add UPCOM and VN30 as placeholders if not fetched
  if (indices.length < 2) {
    indices.push({
      name: "VN30",
      value: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
    });
    indices.push({
      name: "UPCOM",
      value: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
    });
  }

  return indices;
}

// ---------- Fetch movers ----------

async function fetchMovers(): Promise<{
  gainers: MarketMover[];
  losers: MarketMover[];
  active: MarketMover[];
}> {
  const movers: { ticker: string; price: number; change: number; changePercent: number; volume: number }[] = [];

  // Fetch in batches to avoid too many concurrent requests
  const batchSize = 20;
  for (let i = 0; i < Math.min(TRACKED_TICKERS.length, 60); i += batchSize) {
    const batch = TRACKED_TICKERS.slice(i, i + batchSize);
    const symbols = batch.map((t) => `${t}.VN`).join(",");

    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
      const response = await fetchWithTimeout(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
        timeout: 12000,
      });

      if (response.ok) {
        const json = await response.json();
        const quotes = json?.quoteResponse?.result || [];

        for (const quote of quotes) {
          const ticker = (quote.symbol || "").replace(".VN", "");
          movers.push({
            ticker,
            price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            volume: quote.regularMarketVolume || 0,
          });
        }
      }
    } catch {
      // Continue with next batch
    }
  }

  // Sort and categorize
  const validMovers = movers.filter((m) => m.price > 0);

  const gainers = [...validMovers]
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 15)
    .map(toMarketMover);

  const losers = [...validMovers]
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 15)
    .map(toMarketMover);

  const active = [...validMovers]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 15)
    .map(toMarketMover);

  return { gainers, losers, active };
}

function toMarketMover(m: {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}): MarketMover {
  return {
    ticker: m.ticker,
    price: m.price,
    change: m.change,
    changePercent: m.changePercent,
    volume: m.volume,
  };
}

// ---------- Route handler ----------

export async function GET(_request: NextRequest) {
  try {
    // Fetch indices and movers in parallel
    const [indices, movers] = await Promise.all([
      fetchIndexData(),
      fetchMovers(),
    ]);

    return jsonResponse({
      indices,
      gainers: movers.gainers,
      losers: movers.losers,
      active: movers.active,
    });
  } catch (error) {
    console.error("[market] Error:", error);
    return errorResponse("Internal server error while fetching market data", 500);
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
