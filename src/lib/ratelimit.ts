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
