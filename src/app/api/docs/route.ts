import { jsonResponse } from "@/lib/fetch";

export async function GET() {
  const apiDocs = {
    name: "VN Stock Analysis API",
    version: "1.0.0",
    description:
      "REST API for Vietnamese stock market analysis. Provides real-time and historical stock data, market indices, news with sentiment analysis, and user watchlist management.",
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    endpoints: [
      {
        method: "GET",
        path: "/api/stock/history",
        description: "Fetch historical OHLCV candlestick data for a stock ticker",
        parameters: {
          ticker: {
            type: "string",
            required: true,
            description: "Stock ticker symbol (e.g., VCB, FPT, HPG)",
          },
          resolution: {
            type: "string",
            required: false,
            default: "D",
            enum: ["D", "W", "M"],
            description: "Data resolution: Daily, Weekly, or Monthly",
          },
          from: {
            type: "string",
            required: true,
            format: "YYYY-MM-DD",
            description: "Start date for historical data",
          },
          to: {
            type: "string",
            required: true,
            format: "YYYY-MM-DD",
            description: "End date for historical data",
          },
        },
        response: {
          data: "Array of { time, open, high, low, close, volume }",
        },
        example: "/api/stock/history?ticker=VCB&resolution=D&from=2024-01-01&to=2025-08-01",
        sources: ["CafeF", "Yahoo Finance (fallback)"],
      },
      {
        method: "GET",
        path: "/api/stock/info",
        description: "Fetch company information and current market data for a stock",
        parameters: {
          ticker: {
            type: "string",
            required: true,
            description: "Stock ticker symbol",
          },
        },
        response: {
          info: "{ name, industry, marketCap, PE, PB, EPS, ROE, ROA, bookValue, beta }",
          market: "{ price, open, high, low, close, volume, high52w, low52w, dividend, change, changePercent }",
        },
        example: "/api/stock/info?ticker=VCB",
        sources: ["CafeF", "Yahoo Finance (fallback)"],
      },
      {
        method: "GET",
        path: "/api/stock/search",
        description: "Search and autocomplete stock tickers from Vietnamese exchanges",
        parameters: {
          q: {
            type: "string",
            required: true,
            description: "Search query (matches ticker prefix, substring, and company name)",
          },
        },
        response: {
          results: "Array of { ticker, name, exchange } (max 20 results)",
        },
        example: "/api/stock/search?q=VC",
        coverage: "100+ popular VN stocks including VN30, VN100, HNX, and UPCOM tickers",
      },
      {
        method: "GET",
        path: "/api/stock/market",
        description: "Fetch market overview including major indices, top gainers, losers, and most active stocks",
        parameters: {},
        response: {
          indices: "Array of { name, value, change, changePercent, volume } for VNINDEX, HNX-Index, etc.",
          gainers: "Array of top 15 gainers { ticker, price, change, changePercent, volume }",
          losers: "Array of top 15 losers",
          active: "Array of top 15 most active by volume",
        },
        example: "/api/stock/market",
        sources: ["Yahoo Finance"],
      },
      {
        method: "GET",
        path: "/api/news",
        description: "Fetch news articles for a stock ticker with basic sentiment analysis",
        parameters: {
          ticker: {
            type: "string",
            required: false,
            description: "Stock ticker to filter news. Omit for general market news.",
          },
        },
        response: {
          news: "Array of { title, source, url, timestamp, summary, sentiment }",
          sentiment_values: "positive | negative | neutral",
        },
        example: "/api/news?ticker=VCB",
        sources: ["CafeF RSS", "Vietstock RSS"],
        notes: "Sentiment is determined by keyword matching against positive/negative word lists",
      },
      {
        method: "POST",
        path: "/api/auth/register",
        description: "Register a new user account",
        parameters: {
          username: {
            type: "string",
            required: true,
            description: "3-30 characters, alphanumeric and underscores only",
          },
          password: {
            type: "string",
            required: true,
            description: "Minimum 6 characters",
          },
          email: {
            type: "string",
            required: true,
            format: "email",
            description: "Valid email address",
          },
        },
        response: {
          token: "JWT authentication token",
          user: "{ id, username, email }",
        },
      },
      {
        method: "POST",
        path: "/api/auth/login",
        description: "Login with existing credentials",
        parameters: {
          username: {
            type: "string",
            required: true,
          },
          password: {
            type: "string",
            required: true,
          },
        },
        response: {
          token: "JWT authentication token",
          user: "{ id, username, email }",
        },
      },
      {
        method: "GET",
        path: "/api/watchlist",
        description: "Get authenticated user's watchlist",
        authentication: "Bearer token required in Authorization header",
        response: {
          watchlist: "Array of { id, ticker, addedAt }",
        },
      },
      {
        method: "POST",
        path: "/api/watchlist",
        description: "Add a stock ticker to user's watchlist",
        authentication: "Bearer token required in Authorization header",
        parameters: {
          ticker: {
            type: "string",
            required: true,
            description: "Stock ticker symbol to add",
          },
        },
        response: {
          watchlist: "{ id, ticker, addedAt }",
        },
      },
      {
        method: "DELETE",
        path: "/api/watchlist",
        description: "Remove a stock ticker from user's watchlist",
        authentication: "Bearer token required in Authorization header",
        parameters: {
          ticker: {
            type: "string",
            required: true,
            in: "query",
            description: "Stock ticker symbol to remove",
          },
        },
        response: {
          message: "Confirmation message",
        },
        example: "/api/watchlist?ticker=VCB",
      },
      {
        method: "GET",
        path: "/api/docs",
        description: "This documentation endpoint. Returns JSON describing all available API endpoints.",
        parameters: {},
      },
    ],
    authentication: {
      type: "Bearer",
      header: "Authorization: Bearer <token>",
      description: "Obtain a token by registering or logging in. Token is required for watchlist operations.",
    },
    errors: {
      "400": "Bad Request - Invalid or missing parameters",
      "401": "Unauthorized - Invalid or missing authentication token",
      "404": "Not Found - Requested data not available",
      "409": "Conflict - Resource already exists (e.g., duplicate watchlist entry)",
      "500": "Internal Server Error - Server-side error",
    },
    rateLimiting: {
      description: "Rate limiting may apply. Default: 100 requests per 60 seconds.",
    },
  };

  return jsonResponse(apiDocs);
}
