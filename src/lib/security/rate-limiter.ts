/**
 * API Rate Limiter
 *
 * In-memory sliding window rate limiter for Vercel serverless.
 *
 * Limitations of in-memory approach:
 * - Resets on cold start (acceptable for MVP)
 * - Not shared across instances (Vercel handles this via single-region)
 *
 * Production upgrade: Replace with Upstash Redis (@upstash/ratelimit)
 * when you need distributed rate limiting across regions.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Every minute

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // seconds until reset
}

// Default configs per route type
export const RATE_LIMITS = {
  // Auth endpoints: prevent brute force
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 per 15 min
  // API endpoints: normal usage
  api: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 per minute
  // Webhook endpoints: high throughput
  webhook: { windowMs: 60 * 1000, maxRequests: 200 }, // 200 per minute
  // Message sending: prevent spam
  messageSend: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
} as const;

/**
 * Check rate limit for a given identifier.
 *
 * @param identifier - Unique key (IP, user ID, business ID)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  let entry = store.get(key);

  // Create new entry or reset expired one
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit headers for the response.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed && result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Extract client identifier from request.
 * Uses IP address + optional user ID for more accurate limiting.
 */
export function getClientIdentifier(
  request: Request,
  userId?: string
): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  if (userId) {
    return `${userId}:${ip}`;
  }

  return ip;
}
