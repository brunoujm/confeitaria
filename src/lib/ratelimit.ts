import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Configuração do Redis (Upstash) - with graceful degradation
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } else {
    console.warn('Upstash Redis not configured - rate limiting disabled');
  }
} catch (error) {
  console.error('Failed to initialize Redis:', error);
  redis = null;
}

// Rate limiter: 20 requisições por minuto por usuário
export const aiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
      prefix: 'ratelimit:ai',
    })
  : null;

// Rate limiter genérico para outras APIs
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

// Função helper para verificar rate limit
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // If no limiter (Redis not configured), allow in development, block in production
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
    }
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail closed in production (block request), fail open only in development
    if (process.env.NODE_ENV === 'production') {
      return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
    }
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}