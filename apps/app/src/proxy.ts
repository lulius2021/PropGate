import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * In-Memory Rate Limiter (Launch-Version)
 *
 * Production-Upgrade:
 * - Ersetze durch Upstash Redis für Multi-Instance Support
 * - Env Vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * - Package: @upstash/redis
 *
 * Aktuell:
 * - Speichert IPs + Timestamps in-memory
 * - Funktioniert nur bei Single-Instance (Vercel Serverless OK für Start)
 * - Wird bei jedem Cold-Start zurückgesetzt (kein Problem für MVP)
 */

// Rate Limit Storage (In-Memory)
const rateLimitStore = new Map<string, number[]>();

// Rate Limit Config
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const MAX_REQUESTS_PER_WINDOW = {
  login: 5, // Max 5 Login-Versuche pro Minute
  register: 3, // Max 3 Registrierungen pro Minute
  forgotPassword: 3, // Max 3 Passwort-Reset-Anfragen pro 5 Minuten
  verify2fa: 5, // Max 5 2FA-Versuche pro Minute
  api: 100, // Max 100 API-Calls pro Minute
  default: 60, // Max 60 Requests pro Minute (allgemein)
};

// Specific rate limit windows (ms)
const SPECIFIC_WINDOWS: Record<string, number> = {
  "/api/auth/forgot-password": 5 * 60 * 1000, // 5 Minuten
};

/**
 * Rate Limiting prüfen
 */
function checkRateLimit(
  key: string,
  limit: number,
  window: number = RATE_LIMIT_WINDOW
): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const windowStart = now - window;

  // Hole bisherige Requests für diesen Key
  let requests = rateLimitStore.get(key) || [];

  // Filtere alte Requests (außerhalb des Zeitfensters)
  requests = requests.filter((timestamp) => timestamp > windowStart);

  // Prüfe Limit
  if (requests.length >= limit) {
    const resetIn = Math.ceil((requests[0] + window - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      reset: resetIn,
    };
  }

  // Request hinzufügen
  requests.push(now);
  rateLimitStore.set(key, requests);

  return {
    allowed: true,
    remaining: limit - requests.length,
    reset: Math.ceil(window / 1000),
  };
}

/**
 * IP-Adresse aus Request extrahieren
 */
function getIP(request: NextRequest): string {
  // Vercel setzt x-forwarded-for Header
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Fallback
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Get specific rate limit for auth endpoints
 */
function getAuthRateLimit(pathname: string): { limit: number; window: number } | null {
  if (pathname === "/api/auth/callback/credentials") {
    return { limit: MAX_REQUESTS_PER_WINDOW.login, window: RATE_LIMIT_WINDOW };
  }
  if (pathname === "/api/auth/register") {
    return { limit: MAX_REQUESTS_PER_WINDOW.register, window: RATE_LIMIT_WINDOW };
  }
  if (pathname === "/api/auth/forgot-password") {
    return { limit: MAX_REQUESTS_PER_WINDOW.forgotPassword, window: SPECIFIC_WINDOWS[pathname] };
  }
  if (pathname === "/api/auth/verify-2fa") {
    return { limit: MAX_REQUESTS_PER_WINDOW.verify2fa, window: RATE_LIMIT_WINDOW };
  }
  // REST API v1 auth endpoints
  if (pathname === "/api/v1/auth/login") {
    return { limit: MAX_REQUESTS_PER_WINDOW.login, window: RATE_LIMIT_WINDOW };
  }
  if (pathname === "/api/v1/auth/refresh") {
    return { limit: 10, window: RATE_LIMIT_WINDOW };
  }
  if (pathname === "/api/v1/auth/2fa/verify") {
    return { limit: MAX_REQUESTS_PER_WINDOW.verify2fa, window: RATE_LIMIT_WINDOW };
  }
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip rate limiting in local development
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Public paths (Sicherheit, Impressum, etc.)
  const publicPaths = ["/sicherheit", "/impressum", "/datenschutz"];
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const ip = getIP(request);

  // Specific auth endpoint rate limiting (POST only, stricter)
  if (request.method === "POST") {
    const authLimit = getAuthRateLimit(pathname);
    if (authLimit) {
      const key = `${ip}:${pathname}`;
      const result = checkRateLimit(key, authLimit.limit, authLimit.window);

      if (!result.allowed) {
        return new NextResponse(
          JSON.stringify({
            error: `Zu viele Anfragen. Bitte versuchen Sie es in ${result.reset} Sekunden erneut.`,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": result.reset.toString(),
            },
          }
        );
      }
    }
  }

  // General rate limiting
  // Note: strict per-endpoint auth limits are already handled above (POST only).
  // Here we only apply broad per-IP limits to prevent scraping/flooding.
  let limit = MAX_REQUESTS_PER_WINDOW.default;

  if (pathname.startsWith("/api/")) {
    limit = MAX_REQUESTS_PER_WINDOW.api;
  }

  const rateLimitResult = checkRateLimit(ip, limit);

  // Rate Limit Headers hinzufügen
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
  response.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());

  // Rate Limit überschritten
  if (!rateLimitResult.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: "Zu viele Anfragen. Bitte warten Sie einen Moment.",
        retryAfter: rateLimitResult.reset,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": rateLimitResult.reset.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimitResult.reset.toString(),
        },
      }
    );
  }

  // Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
