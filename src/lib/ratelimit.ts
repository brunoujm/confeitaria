import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Validates that required Upstash Redis environment variables are set.
 * In production, throws an error if configuration is missing to enforce fail-closed behavior.
 * In development, logs a warning and returns false to allow fail-open.
 */
function validateRedisConfig(): boolean {
  const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL;
  const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!hasUrl || !hasToken) {
    if (isProduction) {
      // Fail-closed: log error but don't expose sensitive config details
      console.error('[RATE_LIMIT] CRITICAL: Upstash Redis not configured in production. Rate limiting will block all requests.');
      return false;
    } else {
      // Fail-open in development with clear warning
      console.warn('[RATE_LIMIT] WARNING: Upstash Redis not configured. Rate limiting disabled in development.');
      return false;
    }
  }
  return true;
}

// Configuração do Redis (Upstash) - fail-closed in production
let redis: Redis | null = null;
let redisConfigValid = false;

try {
  redisConfigValid = validateRedisConfig();
  if (redisConfigValid) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
} catch (error) {
  // Sanitize error message to avoid leaking sensitive info
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('[RATE_LIMIT] Failed to initialize Redis client:', errorMessage);
  redis = null;
  redisConfigValid = false;
}

// Rate limiter: 20 requisições por minuto por usuário (AI endpoints)
export const aiRateLimiter = redis && redisConfigValid
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
      prefix: 'ratelimit:ai',
    })
  : null;

// Rate limiter genérico para outras APIs: 100 requisições por minuto por usuário
export const apiRateLimiter = redis && redisConfigValid
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

// Rate limiter para endpoints de autenticação: 5 requisições por minuto por IP
export const authRateLimiter = redis && redisConfigValid
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;

/**
 * Helper function to check rate limit with fail-closed behavior in production.
 *
 * @param limiter - The rate limiter instance (can be null if Redis not configured)
 * @param identifier - Unique identifier (user ID, IP address, etc.)
 * @returns Rate limit result with success status and headers
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // If no limiter (Redis not configured or initialization failed)
  if (!limiter || !redisConfigValid) {
    if (process.env.NODE_ENV === 'production') {
      // Fail-closed: block request in production when rate limiting is unavailable
      console.error('[RATE_LIMIT] Blocking request: rate limiting unavailable in production', {
        identifier: identifier.substring(0, 8) + '...', // Partial identifier for logging
        hasLimiter: !!limiter,
        configValid: redisConfigValid,
      });
      return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
    }
    // Fail-open in development: allow but warn
    console.warn('[RATE_LIMIT] Allowing request (fail-open dev): rate limiting unavailable', {
      identifier: identifier.substring(0, 8) + '...',
    });
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
    // Sanitize error for logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RATE_LIMIT] Rate limit check failed:', errorMessage);

    // Fail closed in production (block request), fail open only in development
    if (process.env.NODE_ENV === 'production') {
      return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
    }
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

/**
 * Extract client IP from request for IP-based rate limiting.
 * Handles proxied requests (X-Forwarded-For, X-Real-IP).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first (client)
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  // Fallback for local development
  return 'unknown';
}