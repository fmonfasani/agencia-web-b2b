import { toolLogger } from './logger.js';

const log = toolLogger('idempotency');

interface CachedResult {
  result: unknown;
  expiresAt: number;
}

/** In-memory idempotency cache with TTL */
const cache = new Map<string, CachedResult>();

/** Default TTL: 5 minutes */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Generates a deterministic idempotency key from the given parts.
 */
export function makeIdempotencyKey(...parts: string[]): string {
  return parts.join(':');
}

/**
 * Check if a result is already cached for the given key.
 * Returns the cached result if found and not expired, otherwise null.
 */
export function getCachedResult<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    log.debug(`Idempotency key expired and removed: ${key}`);
    return null;
  }

  log.info(`Idempotency cache hit for key: ${key}`);
  return entry.result as T;
}

/**
 * Store a result in the idempotency cache.
 */
export function setCachedResult(key: string, result: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
  cache.set(key, {
    result,
    expiresAt: Date.now() + ttlMs,
  });
  log.debug(`Cached result for key: ${key} (TTL: ${ttlMs}ms)`);
}

/**
 * Clear expired entries from the cache (housekeeping).
 */
export function cleanupCache(): void {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    log.debug(`Cleaned ${cleaned} expired idempotency entries`);
  }
}

// Run cache cleanup every 2 minutes
setInterval(cleanupCache, 2 * 60 * 1000).unref();
