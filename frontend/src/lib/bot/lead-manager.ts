import { requireTenantId } from "@/lib/tenant-context";
import { Redis } from "@upstash/redis";

// Lazy initialization to avoid crashing when env vars are missing or invalid
let _redis: Redis | null = null;

function isValidRedisUrl(url: string | undefined): boolean {
  return typeof url === "string" && url.startsWith("https://");
}

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (process.env.NODE_ENV !== "test" && (!isValidRedisUrl(url) || !token)) {
    return null;
  }

  try {
    _redis = new Redis({ url: url!, token });
    return _redis;
  } catch (error) {
    console.error("[Lead Manager] Failed to initialize Redis:", error);
    return null;
  }
}

export interface LeadInfo {
  phone: string;
  name?: string;
  email?: string;
  company?: string;
  need?: string;
  budget?: string;
  status: "new" | "qualified" | "disqualified";
  timestamp: string;
  tenantId?: string;
}

/**
 * Saves or updates a lead in the Redis database.
 */
export async function saveLead(
  lead: LeadInfo,
  tenantId?: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[Lead Manager] Redis not available, skipping lead save");
    return;
  }
  try {
    const activeTenantId = requireTenantId(tenantId ?? lead.tenantId);
    const key = `lead:${activeTenantId}:${lead.phone}`;
    await redis.set(key, { ...lead, tenantId: activeTenantId });

    // Also add to a tenant-specific list for easy retrieval
    await redis.sadd(`all_leads:${activeTenantId}`, key);

    console.log(`[Lead Manager] Lead saved/updated: ${lead.phone}`);
  } catch (error) {
    console.error("[Lead Manager] Error saving lead:", error);
  }
}

/**
 * Retrieves a lead by phone number.
 */
export async function getLead(
  phone: string,
  tenantId?: string,
): Promise<LeadInfo | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const activeTenantId = requireTenantId(tenantId);
    return await redis.get<LeadInfo>(`lead:${activeTenantId}:${phone}`);
  } catch (error) {
    console.error("[Lead Manager] Error getting lead:", error);
    return null;
  }
}

/**
 * Gets all leads managed by the bot.
 */
export async function getAllLeads(tenantId?: string): Promise<LeadInfo[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const activeTenantId = requireTenantId(tenantId);
    const keys = await redis.smembers(`all_leads:${activeTenantId}`);
    if (keys.length === 0) return [];

    const leads = await Promise.all(
      keys.map((key) => redis.get<LeadInfo>(key)),
    );

    return leads.filter((l): l is LeadInfo => l !== null);
  } catch (error) {
    console.error("[Lead Manager] Error getting all leads:", error);
    return [];
  }
}
