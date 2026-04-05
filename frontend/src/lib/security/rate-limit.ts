import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

// Validate URL starts with https:// to avoid crashing with invalid env vars
function isValidRedisUrl(url: string | undefined): boolean {
  return typeof url === "string" && url.startsWith("https://");
}

const redis =
  isValidRedisUrl(process.env.UPSTASH_REDIS_REST_URL) &&
  process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// In-memory fallback when Redis is unavailable
// Map<key, { count: number; resetAt: number }>
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

// Log warning if Redis is not configured (one-time on first check)
let redisWarningLogged = false;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

async function checkRateLimitInMemory(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const bucketKey = `ratelimit:${key}`;
  const now = Date.now();
  const entry = inMemoryStore.get(bucketKey);

  // Reset bucket if window has expired
  if (!entry || entry.resetAt < now) {
    inMemoryStore.set(bucketKey, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSec: windowSec };
  }

  // Increment counter
  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);

  return {
    allowed: entry.count <= limit,
    remaining,
    retryAfterSec: Math.max(0, retryAfterSec),
  };
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  // If Redis is unavailable, use in-memory fallback
  if (!redis) {
    if (!redisWarningLogged) {
      logger.warn(
        "[RATE_LIMIT] Redis not configured — using in-memory fallback. Rate limits will not be shared across instances.",
      );
      redisWarningLogged = true;
    }
    return checkRateLimitInMemory(key, limit, windowSec);
  }

  const bucketKey = `ratelimit:${key}`;
  const count = await redis.incr(bucketKey);

  if (count === 1) {
    await redis.expire(bucketKey, windowSec);
  }

  const ttl = await redis.ttl(bucketKey);
  const remaining = Math.max(0, limit - count);

  return {
    allowed: count <= limit,
    remaining,
    retryAfterSec: ttl > 0 ? ttl : windowSec,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
