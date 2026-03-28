import { Redis } from "@upstash/redis";

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

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (!redis) {
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
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
