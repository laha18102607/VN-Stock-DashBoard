import { NextRequest } from "next/server";
import { z } from "zod";
import { fetchWithTimeout, jsonResponse, errorResponse } from "@/lib/fetch";
import type { OHLCCandle } from "@/lib/types";

const querySchema = z.object({
  ticker: z
    .string()
    .min(1, "Ticker is required")
    .max(10)
    .transform((v) => v.toUpperCase()),
  resolution: z.enum(["D", "W", "M"]).default("D"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
});

// ---------- CafeF source ----------

async function fetchFromCafeF(
  ticker: string,
  from: string,
  to: string
): Promise<OHLCCandle[] | null> {
  try {
    const body = new URLSearchParams({
      Symbol: ticker,
      StartDate: formatDateForCafeF(from),
      EndDate: formatDateForCafeF(to),
      PageIndex: "1",
      PageSize: "5000",
    });

    const response = await fetchWithTimeout(
      "https://s.cafef.vn/Ajax/PageNew/DataHistory/PriceHistory.ashx",
      {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Referer: "https://s.cafef.vn/",
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: body.toString(),
        timeout: 15000,
      }
    );

    if (!response.ok) return null;

    const text = await response.text();

    // Try JSON parse first (some endpoints return JSON)
    try {
      const json = JSON.parse(text);
      if (json?.Data?.Data) {
        return parseCafeFJsonData(json.Data.Data);
      }
    } catch {
      // Not JSON - try HTML table parsing
    }

    // Parse HTML table
    return parseCafeFHtmlTable(text);
  } catch {
    return null;
  }
}

function formatDateForCafeF(dateStr: string): string {
  // CafeF expects DD/MM/YYYY
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

interface CafeFRow {
  Ngay?: string;
  "Ngay "?: string;
  "Gia Mo"?: string | number;
  "Gia Mo "?: string | number;
  GiaMo?: string | number;
  "Gia Cao Nhat"?: string | number;
  "Gia Cao Nhat "?: string | number;
  GiaCaoNhat?: string | number;
  "Gia Thap Nhat"?: string | number;
  "Gia Thap Nhat "?: string | number;
  GiaThapNhat?: string | number;
  "Gia Dong Cua"?: string | number;
  "Gia Dong Cua "?: string | number;
  GiaDongCua?: string | number;
  "Khoi Luong"?: string | number;
  "Khoi Luong "?: string | number;
  KhoiLuong?: string | number;
  [key: string]: unknown;
}

function parseCafeFJsonData(rows: CafeFRow[]): OHLCCandle[] {
  const candles: OHLCCandle[] = [];

  for (const row of rows) {
    const dateStr = (row.Ngay || row["Ngay "] || "") as string;
    const open = parseNum(row["Gia Mo"] ?? row["Gia Mo "] ?? row.GiaMo);
    const high = parseNum(
      row["Gia Cao Nhat"] ?? row["Gia Cao Nhat "] ?? row.GiaCaoNhat
    );
    const low = parseNum(
      row["Gia Thap Nhat"] ?? row["Gia Thap Nhat "] ?? row.GiaThapNhat
    );
    const close = parseNum(
      row["Gia Dong Cua"] ?? row["Gia Dong Cua "] ?? row.GiaDongCua
    );
    const volume = parseNum(row["Khoi Luong"] ?? row["Khoi Luong "] ?? row.KhoiLuong);

    if (dateStr && close > 0) {
      candles.push({
        time: new Date(normalizeCafeFDate(dateStr)).getTime(),
        open,
        high,
        low,
        close,
        volume,
      });
    }
  }

  return candles.sort((a, b) => a.time - b.time);
}

function parseCafeFHtmlTable(html: string): OHLCCandle[] {
  const candles: OHLCCandle[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    const rowContent = rowMatch[1];

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
    }

    if (cells.length >= 6) {
      const dateStr = cells[0];
      const open = parseNum(cells[1]);
      const high = parseNum(cells[2]);
      const low = parseNum(cells[3]);
      const close = parseNum(cells[4]);
      const volume = parseNum(cells[5]);

      if (dateStr && close > 0) {
        candles.push({
          time: new Date(normalizeCafeFDate(dateStr)).getTime(),
          open,
          high,
          low,
          close,
          volume,
        });
      }
    }
  }

  return candles.sort((a, b) => a.time - b.time);
}

function normalizeCafeFDate(dateStr: string): string {
  // Handle DD/MM/YYYY → YYYY-MM-DD
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return dateStr;
}

function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").replace(/\./g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// ---------- Yahoo Finance source ----------

async function fetchFromYahoo(
  ticker: string,
  from: string,
  to: string
): Promise<OHLCCandle[] | null> {
  try {
    const fromTs = Math.floor(new Date(from).getTime() / 1000);
    const toTs = Math.floor(new Date(to).getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.VN?period1=${fromTs}&period2=${toTs}&interval=1d`;

    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    if (!response.ok) return null;

    const json = await response.json();
    const result = json?.chart?.result?.[0];

    if (!result) return null;

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];

    if (!quote) return null;

    const candles: OHLCCandle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close?.[i];
      const volume = quote.volume?.[i];

      if (
        open != null &&
        high != null &&
        low != null &&
        close != null &&
        volume != null &&
        !isNaN(open) &&
        !isNaN(close)
      ) {
        candles.push({
          time: timestamps[i] * 1000,
          open: Math.round(open * 100) / 100,
          high: Math.round(high * 100) / 100,
          low: Math.round(low * 100) / 100,
          close: Math.round(close * 100) / 100,
          volume: Math.round(volume),
        });
      }
    }

    return candles;
  } catch {
    return null;
  }
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

    const { ticker, from, to } = parsed.data;

    // Multi-source fallback: CafeF first, then Yahoo
    let candles = await fetchFromCafeF(ticker, from, to);

    if (!candles || candles.length === 0) {
      candles = await fetchFromYahoo(ticker, from, to);
    }

    if (!candles || candles.length === 0) {
      return errorResponse(
        `No price data found for ${ticker} between ${from} and ${to}. The ticker may be invalid or data sources may be unavailable.`,
        404
      );
    }

    return jsonResponse({ data: candles });
  } catch (error) {
    console.error("[stock/history] Error:", error);
    return errorResponse("Internal server error while fetching stock history", 500);
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
