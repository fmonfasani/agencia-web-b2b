/**
 * lib/api/auth.ts
 * API functions for Auth, Sessions, Users, Memberships — delegates to backend-saas:8000
 */

import { saasClient } from "./api-client";

export interface UserApiRecord {
  id: string;
  email: string;
  role?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tenantId?: string | null;
  sessionToken: string;
  expires: string;
  revokedAt?: string | null;
}

export interface MembershipRecord {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  status: string;
  acceptedAt?: string | null;
}

export async function getUserById(userId: string): Promise<UserApiRecord | null> {
  const result = await saasClient.get<UserApiRecord>(`/auth/users/${userId}`);
  return result.success ? (result.data ?? null) : null;
}

export async function getMembershipByUser(
  userId: string,
  tenantId?: string,
): Promise<MembershipRecord | null> {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  const result = await saasClient.get<MembershipRecord>(`/auth/memberships/${userId}${params}`);
  return result.success ? (result.data ?? null) : null;
}

export async function createSession(
  userId: string,
  tenantId?: string,
): Promise<{ token: string; session: SessionRecord } | null> {
  const result = await saasClient.post<{ token: string; session: SessionRecord }>(
    "/auth/sessions",
    { userId, tenantId },
  );
  return result.success ? (result.data ?? null) : null;
}

export async function validateSessionToken(rawToken: string): Promise<{
  session: SessionRecord;
  token: string;
  rotated: boolean;
} | null> {
  const result = await saasClient.post<{
    session: SessionRecord;
    token: string;
    rotated: boolean;
  }>("/auth/sessions/validate", { token: rawToken });
  return result.success ? (result.data ?? null) : null;
}

export async function revokeSession(rawToken: string): Promise<void> {
  await saasClient.post("/auth/sessions/revoke", { token: rawToken });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await saasClient.post(`/auth/sessions/revoke-all`, { userId });
}

export async function updateSessionTenant(sessionId: string, tenantId: string): Promise<void> {
  await saasClient.put(`/auth/sessions/${sessionId}/tenant`, { tenantId });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await saasClient.post("/auth/password-reset/request", { email });
}

export async function completePasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<void> {
  await saasClient.post("/auth/password-reset/complete", { token: rawToken, newPassword });
}
