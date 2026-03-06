/**
 * JWT utilities for REST API v1
 *
 * Uses jose library (transitive dep of next-auth) for JWT signing/verification.
 * Signing key derived from NEXTAUTH_SECRET + ':api-v1' (HS256).
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ALG = "HS256";

function getSigningKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret + ":api-v1");
}

export interface AccessTokenPayload extends JWTPayload {
  sub: string; // userId
  tid: string; // tenantId
  role: string; // UserRole
  twoFa: boolean; // 2FA verified
}

export interface TempTokenPayload extends JWTPayload {
  sub: string; // userId
  purpose: "2fa";
}

/**
 * Sign an access token (15min expiry)
 */
export async function signAccessToken(payload: {
  userId: string;
  tenantId: string;
  role: string;
  twoFaVerified: boolean;
}): Promise<string> {
  return new SignJWT({
    sub: payload.userId,
    tid: payload.tenantId,
    role: payload.role,
    twoFa: payload.twoFaVerified,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("propgate-api")
    .sign(getSigningKey());
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getSigningKey(), {
    issuer: "propgate-api",
  });
  return payload as AccessTokenPayload;
}

/**
 * Sign a temporary pre-2FA token (5min expiry)
 */
export async function signTempToken(userId: string): Promise<string> {
  return new SignJWT({
    sub: userId,
    purpose: "2fa",
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setIssuer("propgate-api")
    .sign(getSigningKey());
}

/**
 * Verify a temporary pre-2FA token
 */
export async function verifyTempToken(
  token: string
): Promise<TempTokenPayload> {
  const { payload } = await jwtVerify(token, getSigningKey(), {
    issuer: "propgate-api",
  });
  if ((payload as any).purpose !== "2fa") {
    throw new Error("Invalid token purpose");
  }
  return payload as TempTokenPayload;
}

/**
 * Generate a refresh token (random string, stored hashed in DB)
 */
export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash a refresh token for storage
 */
export async function hashRefreshToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
