import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/fetch";

// GET /api/watchlist - Get user's watchlist
async function handleGet(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return errorResponse("Unauthorized. Please provide a valid Bearer token.", 401);
  }

  const watchlist = await prisma.watchlist.findMany({
    where: { userId: user.userId },
    orderBy: { addedAt: "desc" },
  });

  return jsonResponse({
    watchlist: watchlist.map((item) => ({
      id: item.id,
      ticker: item.ticker,
      addedAt: item.addedAt.toISOString(),
    })),
  });
}

// POST /api/watchlist - Add ticker to watchlist
async function handlePost(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return errorResponse("Unauthorized. Please provide a valid Bearer token.", 401);
  }

  const bodySchema = z.object({
    ticker: z
      .string()
      .min(1, "Ticker is required")
      .max(10)
      .transform((v) => v.toUpperCase()),
  });

  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const { ticker } = parsed.data;

    // Check if already in watchlist
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_ticker: {
          userId: user.userId,
          ticker,
        },
      },
    });

    if (existing) {
      return errorResponse(`${ticker} is already in your watchlist`, 409);
    }

    const item = await prisma.watchlist.create({
      data: {
        userId: user.userId,
        ticker,
      },
    });

    return jsonResponse(
      {
        watchlist: {
          id: item.id,
          ticker: item.ticker,
          addedAt: item.addedAt.toISOString(),
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors.map((e) => e.message).join(", "), 400);
    }
    throw error;
  }
}

// DELETE /api/watchlist - Remove ticker from watchlist
async function handleDelete(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return errorResponse("Unauthorized. Please provide a valid Bearer token.", 401);
  }

  const ticker = request.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return errorResponse("Ticker parameter is required", 400);
  }

  const upperTicker = ticker.toUpperCase();

  // Check if exists
  const existing = await prisma.watchlist.findUnique({
    where: {
      userId_ticker: {
        userId: user.userId,
        ticker: upperTicker,
      },
    },
  });

  if (!existing) {
    return errorResponse(`${upperTicker} is not in your watchlist`, 404);
  }

  await prisma.watchlist.delete({
    where: {
      userId_ticker: {
        userId: user.userId,
        ticker: upperTicker,
      },
    },
  });

  return jsonResponse({
    message: `${upperTicker} removed from watchlist`,
  });
}

export async function GET(request: NextRequest) {
  try {
    return await handleGet(request);
  } catch (error) {
    console.error("[watchlist GET] Error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (error) {
    console.error("[watchlist POST] Error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await handleDelete(request);
  } catch (error) {
    console.error("[watchlist DELETE] Error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
