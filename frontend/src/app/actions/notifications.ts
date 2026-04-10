"use server";

import { auth } from "@/lib/auth";
import { saasClientFor } from "@/lib/saas-client";
import type {
  Notification,
  NotificationsListResponse,
} from "@/lib/saas-client";

async function getClient() {
  const session = await auth();
  const apiKey =
    (session?.user as any)?.apiKey || (session as any)?.backendApiKey;
  if (!apiKey) throw new Error("No API key in session");
  return saasClientFor(apiKey);
}

export async function getNotifications(
  unreadOnly = false,
  limit = 20,
): Promise<NotificationsListResponse> {
  try {
    const client = await getClient();
    return await client.notifications.list({ limit, unread_only: unreadOnly });
  } catch {
    return { notifications: [], unread_count: 0, total: 0 };
  }
}

export async function markNotificationRead(
  id: string,
): Promise<{ success: boolean }> {
  try {
    const client = await getClient();
    return await client.notifications.markRead(id);
  } catch {
    return { success: false };
  }
}

export async function markAllNotificationsRead(): Promise<{
  success: boolean;
}> {
  try {
    const client = await getClient();
    return await client.notifications.markAllRead();
  } catch {
    return { success: false };
  }
}
