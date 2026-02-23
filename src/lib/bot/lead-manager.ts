import { requireTenantId } from "@/lib/tenant-context";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export interface LeadInfo {
  phone: string;
  name?: string;
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
