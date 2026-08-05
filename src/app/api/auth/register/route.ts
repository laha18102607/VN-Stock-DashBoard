import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/fetch";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const { username, password, email } = parsed.data;

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username } },
          { email: { equals: email } },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return errorResponse("Username already taken", 409);
      }
      return errorResponse("Email already registered", 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
    });

    // Generate JWT token
    const token = signToken({
      userId: user.id,
      username: user.username,
    });

    return jsonResponse(
      {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      201
    );
  } catch (error) {
    console.error("[auth/register] Error:", error);
    return errorResponse("Internal server error during registration", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
