import { NextRequest } from "next/server";
import { z } from "zod";
import { fetchWithTimeout, jsonResponse, errorResponse } from "@/lib/fetch";
import type { NewsItem } from "@/lib/types";

const querySchema = z.object({
  ticker: z
    .string()
    .min(1, "Ticker is required")
    .max(10)
    .transform((v) => v.toUpperCase())
    .optional(),
  page: z.string().transform(Number).default("1"),
});

// ---------- Sentiment Analysis ----------

const POSITIVE_KEYWORDS = [
  "tang", "growth", "profit", "lai", "positive", "bull", "uptrend", "breakout",
  "recovery", "phuc hoi", "dot pha", "ky luc", "record", "cao nhat", "highest",
  "dividend", "co tuc", "buyback", "mua lai", "upgrade", "nang hang", "target",
  "muc tieu", "potential", "tiem nang", "opportunity", "co hoi", "strong",
  "manh", "robust", "solid", "vung chac", "beat", "vuot", "outperform",
  "surpass", "vượt", "thanh cong", "success", "expansion", "mo rong",
  "innovation", "sang tao", "leading", "dan dau", "market share", "thi phan",
  "revenue growth", "tang doanh thu", "profit increase", "tang loi nhuan",
  "new high", "dinh cao", "accumulation", "tich luy", "institutional buy",
  "foreign buy", "khoi ngoai mua", "net buy", "mua rong",
];

const NEGATIVE_KEYWORDS = [
  "giam", "decline", "loss", "lo", "negative", "bear", "downtrend", "crash",
  "suy giam", "sup", "ky luc thap", "lowest", "thap nhat", "sell-off", "ban thao",
  "warning", "canh bao", "risk", "rui ro", "downgrade", "ha hang", "lawsuit",
  "kien", "penalty", "phat", "violation", "vi pham", "fraud", "gian lan",
  "bankruptcy", "pha san", "debt", "no", "default", "vo no", "weak", "yeu",
  "poor", "kem", "underperform", "miss", "thua", "failure", "that bai",
  "scandal", "corruption", "tham nhung", "investigation", "dieu tra",
  "layoff", "cat giam", "restructure", "tai cau truc", "recession", "suy thoai",
  "inflation", "lam phat", "rate hike", "tang lai suat", "foreign sell",
  "khoi ngoai ban", "net sell", "ban rong", "dilution", "pha loang",
  "shortage", "thieu hut", "supply chain", "chuoi cung ung", "disruption",
];

function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const lowerText = text.toLowerCase();

  let positiveCount = 0;
  let negativeCount = 0;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      positiveCount++;
    }
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      negativeCount++;
    }
  }

  if (positiveCount > negativeCount + 1) return "positive";
  if (negativeCount > positiveCount + 1) return "negative";
  return "neutral";
}

// ---------- RSS Parsing ----------

function parseRssXml(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];

  // Simple XML parser for RSS items
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    const description = extractTag(itemXml, "description");

    if (title) {
      const fullText = `${title} ${description}`;
      const sentiment = analyzeSentiment(fullText);

      items.push({
        title: cleanHtml(title),
        source,
        url: link || "#",
        timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        summary: cleanHtml(stripHtml(description || "")).slice(0, 200),
        sentiment,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  // Try CDATA first
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  // Regular tag
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = regex.exec(xml);
  return match?.[1]?.trim() || "";
}

function cleanHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// ---------- News Sources ----------

async function fetchCafeFNews(ticker: string): Promise<NewsItem[]> {
  try {
    const url = `https://s.cafef.vn/Ajax/PageNew/RssFeed.ashx?Type=TinTuc&Symbol=${ticker}`;
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Referer: "https://s.cafef.vn/",
      },
      timeout: 10000,
    });

    if (!response.ok) return [];

    const xml = await response.text();
    return parseRssXml(xml, "CafeF");
  } catch {
    // Try alternate CafeF URL
    try {
      const altUrl = `https://cafef.vn/tim-kiem/${ticker}.chn`;
      const response = await fetchWithTimeout(altUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
        timeout: 10000,
      });

      if (response.ok) {
        const html = await response.text();
        return parseCafeFHtmlNews(html);
      }
    } catch {
      // Ignore
    }
    return [];
  }
}

function parseCafeFHtmlNews(html: string): NewsItem[] {
  const items: NewsItem[] = [];
  // Simple extraction of news items from HTML
  const articleRegex = /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(html)) !== null) {
    const content = match[1];
    const titleMatch = /<a[^>]*>([\s\S]*?)<\/a>/i.exec(content);
    const linkMatch = /<a[^>]*href="([^"]*)"/i.exec(content);

    if (titleMatch) {
      const title = cleanHtml(stripHtml(titleMatch[1]));
      if (title.length > 5) {
        items.push({
          title,
          source: "CafeF",
          url: linkMatch?.[1] ? `https://cafef.vn${linkMatch[1]}` : "#",
          timestamp: new Date().toISOString(),
          summary: title.slice(0, 200),
          sentiment: analyzeSentiment(title),
        });
      }
    }
  }

  return items;
}

async function fetchVietstockNews(ticker: string): Promise<NewsItem[]> {
  try {
    const url = `https://vietstock.vn/rss/tim-kiem/${ticker.toLowerCase()}.rss`;
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    if (!response.ok) return [];

    const xml = await response.text();
    return parseRssXml(xml, "Vietstock");
  } catch {
    return [];
  }
}

async function fetchGeneralMarketNews(): Promise<NewsItem[]> {
  try {
    const url = "https://cafef.vn/thi-truong-chung-khoan.rss";
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    if (!response.ok) return [];

    const xml = await response.text();
    return parseRssXml(xml, "CafeF");
  } catch {
    return [];
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

    const { ticker } = parsed.data;

    let allNews: NewsItem[] = [];

    if (ticker) {
      // Fetch news from multiple sources in parallel
      const [cafeFNews, vietstockNews] = await Promise.all([
        fetchCafeFNews(ticker),
        fetchVietstockNews(ticker),
      ]);

      allNews = [...cafeFNews, ...vietstockNews];
    } else {
      // General market news
      allNews = await fetchGeneralMarketNews();
    }

    // Deduplicate by title similarity
    const seen = new Set<string>();
    const uniqueNews: NewsItem[] = [];
    for (const item of allNews) {
      const key = item.title.toLowerCase().slice(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNews.push(item);
      }
    }

    // Sort by timestamp (newest first)
    uniqueNews.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return jsonResponse({ news: uniqueNews.slice(0, 50) });
  } catch (error) {
    console.error("[news] Error:", error);
    return errorResponse("Internal server error while fetching news", 500);
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
