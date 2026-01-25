import { Redis } from "@upstash/redis";

// Lazy initialization of Redis client to prevent build errors
let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[Redis] Missing configuration. Redis operations will be skipped.",
      );
    }
    return null;
  }

  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch (error) {
    console.error("[Redis] Failed to initialize client:", error);
    return null;
  }
}

const CONVERSATION_TTL = 60 * 60 * 24; // 24 hours in seconds

export interface MessageContext {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Gets the conversation history for a specific user.
 */
export async function getConversationHistory(
  userId: string,
): Promise<MessageContext[]> {
  try {
    const client = getRedis();
    if (!client) return [];
    const history = await client.get<MessageContext[]>(`chat:${userId}`);
    return history || [];
  } catch (error) {
    console.error(`[Redis] Error getting history for ${userId}:`, error);
    return [];
  }
}

/**
 * Saves or updates conversation history for a specific user.
 */
export async function updateConversationHistory(
  userId: string,
  newMessage: MessageContext,
): Promise<void> {
  try {
    const history = await getConversationHistory(userId);

    // Keep only the last 10 messages to manage context window and costs
    const updatedHistory = [...history, newMessage].slice(-11);

    const client = getRedis();
    if (!client) return;
    await client.set(`chat:${userId}`, updatedHistory, {
      ex: CONVERSATION_TTL,
    });
  } catch (error) {
    console.error(`[Redis] Error updating history for ${userId}:`, error);
  }
}

/**
 * Clears conversation history (useful for reset commands).
 */
export async function clearConversationHistory(userId: string): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;
    await client.del(`chat:${userId}`);
  } catch (error) {
    console.error(`[Redis] Error clearing history for ${userId}:`, error);
  }
}
