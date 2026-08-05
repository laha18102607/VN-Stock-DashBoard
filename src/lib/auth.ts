import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import type { JWTPayload } from './types';

const JWT_SECRET =
  process.env.JWT_SECRET || 'vn-stock-analysis-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for the given userId.
 */
export function generateToken(userId: string): string {
  const payload: JWTPayload = { userId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token.
 * Returns the payload if valid, null otherwise.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

/**
 * Extract a JWT token from an incoming request.
 * Checks Authorization header first, then falls back to cookies.
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Middleware helper: authenticate a request.
 * Returns the userId if authenticated, null otherwise.
 */
export function authenticateRequest(request: NextRequest): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

/**
 * Require authentication or throw a 401-style error.
 * Use in API route handlers.
 */
export function requireAuth(request: NextRequest): string {
  const userId = authenticateRequest(request);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}
