import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Production: Redis-based rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  analytics: true,
  prefix: '@upstash/ratelimit',
});

export async function checkRateLimit(identifier: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);
  
  return {
    success,
    limit,
    remaining,
    reset,
  };
  }
  // Simple in-memory rate limiter
// Production: gunakan Redis atau Upstash Rate Limit

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(identifier: string, limit: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = store.get(identifier);

  // Cleanup expired entries
  if (entry && now > entry.resetAt) {
    store.delete(identifier);
  }

  const current = store.get(identifier);

  if (!current) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false; // Rate limit exceeded
  }

  current.count++;
  return true;
}

export function getRateLimitInfo(identifier: string): { remaining: number; resetAt: number } | null {
  const entry = store.get(identifier);
  if (!entry) return null;
  return {
    remaining: Math.max(0, 20 - entry.count),
    resetAt: entry.resetAt,
  };
}

  
