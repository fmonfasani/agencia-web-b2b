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
}

/**
 * Saves or updates a lead in the Redis database.
 */
export async function saveLead(lead: LeadInfo): Promise<void> {
  try {
    const key = `lead:${lead.phone}`;
    await redis.set(key, lead);

    // Also add to a general list for easy retrieval
    await redis.sadd("all_leads", key);

    console.log(`[Lead Manager] Lead saved/updated: ${lead.phone}`);
  } catch (error) {
    console.error("[Lead Manager] Error saving lead:", error);
  }
}

/**
 * Retrieves a lead by phone number.
 */
export async function getLead(phone: string): Promise<LeadInfo | null> {
  try {
    return await redis.get<LeadInfo>(`lead:${phone}`);
  } catch (error) {
    console.error("[Lead Manager] Error getting lead:", error);
    return null;
  }
}

/**
 * Gets all leads managed by the bot.
 */
export async function getAllLeads(): Promise<LeadInfo[]> {
  try {
    const keys = await redis.smembers("all_leads");
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
