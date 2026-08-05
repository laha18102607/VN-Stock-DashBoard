# VN Stock Analysis Platform

A production-ready Vietnamese stock analysis web application built with Next.js, featuring real-time market data, interactive TradingView charts, 19 technical indicators, Smart Money Concepts detection, candlestick pattern recognition, and AI-powered scoring.

## Features

- **Interactive Charts**: TradingView Lightweight Charts with candlestick, volume, and overlay indicators
- **19 Technical Indicators**: SMA, EMA, VWMA, RSI, MACD, Bollinger Bands, ATR, ADX, OBV, Stochastic, CCI, Ichimoku Cloud, Parabolic SAR, Supertrend, Pivot Points, Fibonacci, Donchian Channel, Keltner Channel, Money Flow Index, Volume Profile
- **Smart Money Concepts**: Break of Structure, Change of Character, Liquidity Sweep, Order Blocks, Fair Value Gaps, Equal Highs/Lows, Premium/Discount, Mitigation, Breaker Blocks
- **Candlestick Patterns**: 14 patterns with confidence levels (Doji, Hammer, Engulfing, Morning/Evening Star, etc.)
- **AI Scoring**: Weighted score 0-100 with recommendation (Strong Buy → Strong Sell)
- **Market Dashboard**: VNINDEX, HNX, Top Gainers/Losers, Market Overview
- **News Aggregation**: CafeF + Vietstock RSS with sentiment analysis
- **Watchlist**: Save favorite stocks with authentication
- **Dark/Light Mode**: Toggle between themes
- **Search**: Autocomplete with 130+ Vietnamese stock tickers

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Charts**: TradingView Lightweight Charts v4
- **Backend**: Next.js API Routes (serverless)
- **Database**: SQLite via Prisma ORM (easy swap to PostgreSQL/Supabase)
- **Auth**: JWT + bcrypt
- **Deployment**: Vercel (free tier)

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd vn-stock-analysis

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Generate Prisma client & push schema
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect GitHub repo to vercel.com for auto-deploy
```

### Environment Variables (Vercel Dashboard → Settings → Environment Variables)

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret key for JWT token signing | Yes |
| `DATABASE_URL` | Database connection string | Yes (default: `file:./dev.db`) |
| `ALPHAVANTAGE_API_KEY` | AlphaVantage API key (optional) | No |
| `FINNHUB_API_KEY` | Finnhub API key (optional) | No |

## Project Structure

```
src/
├── app/
│   ├── api/                  # API routes (serverless)
│   │   ├── stock/history/    # OHLCV price history
│   │   ├── stock/info/       # Company info + market data
│   │   ├── stock/search/     # Ticker search/autocomplete
│   │   ├── stock/market/     # Market overview (VNINDEX, gainers, losers)
│   │   ├── news/             # News RSS aggregation
│   │   ├── auth/             # Registration + login
│   │   └── watchlist/        # User watchlist CRUD
│   ├── stock/[ticker]/       # Stock analysis page
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Dashboard homepage
│   └── globals.css           # Global styles + theme variables
├── components/
│   ├── chart/                # TradingView chart components
│   ├── analysis/             # Analysis panels (indicators, patterns, scoring)
│   ├── dashboard/            # Dashboard widgets
│   ├── search/               # Search autocomplete
│   ├── layout/               # Navbar, footer
│   └── ui/                   # shadcn/ui base components
├── lib/
│   ├── indicators.ts         # 19 technical indicator calculations
│   ├── smart-money.ts        # Smart Money Concepts detector
│   ├── patterns.ts           # 14 candlestick pattern detectors
│   ├── scoring.ts            # Weighted scoring engine (0-100)
│   ├── data-sources.ts       # Multi-source data fetcher (CafeF, Yahoo, Vietstock)
│   ├── auth.ts               # JWT + bcrypt utilities
│   ├── db.ts                 # Prisma client singleton
│   ├── types.ts              # TypeScript type definitions
│   └── utils.ts              # Formatting & utility functions
└── hooks/
    ├── use-stock-data.ts     # Stock data fetching hook
    └── use-toast.ts          # Toast notification hook
prisma/
└── schema.prisma             # Database schema
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stock/history?ticker=VCB&resolution=D` | OHLCV price history |
| GET | `/api/stock/info?ticker=VCB` | Company info + market data |
| GET | `/api/stock/search?q=VC` | Ticker search/autocomplete |
| GET | `/api/stock/market` | Market overview |
| GET | `/api/news?ticker=VCB` | News with sentiment |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET/POST/DELETE | `/api/watchlist` | Watchlist management (auth required) |
| GET | `/api/docs` | API documentation |

## Data Sources

Primary: **CafeF** (with proper headers)
Fallback: **Yahoo Finance** (VCB.VN format)
Backup: **Vietstock**

The data fetcher automatically falls back to the next source if one fails.

## License

MIT
