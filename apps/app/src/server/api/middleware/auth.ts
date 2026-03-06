/**
 * Bearer token authentication middleware for REST API
 */

import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt";
import { ApiError } from "../lib/response";

export interface ApiContext {
  userId: string;
  tenantId: string;
  role: string;
  twoFaVerified: boolean;
}

/**
 * Extract and verify Bearer token from request
 */
export async function authenticateRequest(
  request: Request
): Promise<ApiContext> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "Fehlender oder ungültiger Authorization-Header"
    );
  }

  const token = authHeader.slice(7);

  let payload: AccessTokenPayload;
  try {
    payload = await verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "TOKEN_EXPIRED", "Token abgelaufen oder ungültig");
  }

  // Ensure 2FA was completed if required
  if (!payload.twoFa) {
    throw new ApiError(
      403,
      "TWO_FA_REQUIRED",
      "Zwei-Faktor-Authentifizierung erforderlich"
    );
  }

  return {
    userId: payload.sub,
    tenantId: payload.tid,
    role: payload.role,
    twoFaVerified: payload.twoFa,
  };
}
