import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

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
    const history = await redis.get<MessageContext[]>(`chat:${userId}`);
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

    await redis.set(`chat:${userId}`, updatedHistory, { ex: CONVERSATION_TTL });
  } catch (error) {
    console.error(`[Redis] Error updating history for ${userId}:`, error);
  }
}

/**
 * Clears conversation history (useful for reset commands).
 */
export async function clearConversationHistory(userId: string): Promise<void> {
  try {
    await redis.del(`chat:${userId}`);
  } catch (error) {
    console.error(`[Redis] Error clearing history for ${userId}:`, error);
  }
}
