/**
 * Rate Limiting
 *
 * Nutzt Upstash Redis wenn UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN gesetzt sind
 * (produktionstauglich für Vercel Serverless).
 *
 * Fällt auf In-Memory-Fallback zurück wenn Upstash nicht konfiguriert ist
 * (nur für lokale Entwicklung geeignet).
 */

// ─── Upstash (persistentes Rate Limiting für Serverless) ─────────────────────

function isUpstashConfigured() {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

async function checkRateLimitUpstash(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = Redis.fromEnv();
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
    prefix: "propgate:rl",
  });

  const { success, remaining, reset } = await ratelimit.limit(key);
  const resetIn = Math.max(0, Math.ceil((reset - Date.now()) / 1000));

  return { allowed: success, remaining, resetIn };
}

// ─── In-Memory Fallback (nur für Entwicklung) ────────────────────────────────

type RateLimitEntry = { timestamps: number[] };
const store = new Map<string, RateLimitEntry>();

if (process.env.NODE_ENV !== "production") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.timestamps.every((t) => now - t > 600_000)) {
        store.delete(key);
      }
    }
  }, 300_000);
}

function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[rate-limit] In-Memory Rate Limiting in Production! " +
        "Setze UPSTASH_REDIS_REST_URL und UPSTASH_REDIS_REST_TOKEN."
    );
  }

  const now = Date.now();
  const entry = store.get(key) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0];
    const resetIn = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true, remaining: limit - entry.timestamps.length, resetIn: 0 };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  if (isUpstashConfigured()) {
    return checkRateLimitUpstash(key, limit, windowMs);
  }
  return checkRateLimitMemory(key, limit, windowMs);
}
