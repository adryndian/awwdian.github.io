// Rate limiting - supports both Upstash Redis (production) and in-memory (development)

// --- In-memory fallback (development / no Redis configured) ---
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const store = new Map<string, RateLimitEntry>();

function inMemoryRateLimit(
  identifier: string,
  limit = 20,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const entry = store.get(identifier);

  if (entry && now > entry.resetAt) {
    store.delete(identifier);
  }

  const current = store.get(identifier);
  if (!current) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count++;
  return true;
}

// --- Unified export used by route.ts ---
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  // Only import Upstash at runtime when env vars are present
  // This prevents build-time crash when vars are not set
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    try {
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis } = await import('@upstash/redis');

      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        analytics: true,
        prefix: '@upstash/ratelimit',
      });

      const { success, limit, remaining, reset } =
        await limiter.limit(identifier);
      return { success, limit, remaining, reset };
    } catch (err) {
      console.warn('[RateLimit] Upstash unavailable, falling back to in-memory:', err);
    }
  }

  // Fallback: in-memory rate limiter
  const success = inMemoryRateLimit(identifier, 20, 60000);
  return {
    success,
    limit: 20,
    remaining: success ? 19 : 0,
    reset: Date.now() + 60000,
  };
}
