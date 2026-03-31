/**
 * lib/api/invitations.ts
 * API functions for Invitation resource — delegates to backend-saas:8000
 */

import { saasClient } from "./api-client";

export interface InvitationApiRecord {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  status: string;
  tokenHash?: string;
  expiresAt?: string;
  invitedAt?: string;
  acceptedAt?: string | null;
  tenant?: { id: string; name: string };
  invitedBy?: { email: string };
}

export interface CreateInvitationInput {
  email: string;
  tenantId: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  invitedByEmail: string;
  tenantName?: string;
  expiresInDays?: number;
}

export async function createInvitation(input: CreateInvitationInput): Promise<{
  success: boolean;
  invitationId?: string;
  invitationToken?: string;
  expiresAt?: string;
  error?: string;
}> {
  const result = await saasClient.post<{
    success: boolean;
    invitationId: string;
    invitationToken: string;
    expiresAt: string;
  }>("/invitations", input);
  return result.success ? (result.data ?? { success: false }) : { success: false, error: result.error };
}

export async function getInvitationByToken(token: string): Promise<{
  email: string;
  role: string;
  expiresAt: string;
  tenant: { id: string; name: string };
  invitedBy: string;
} | null> {
  const result = await saasClient.get(`/invitations/validate?token=${token}`);
  return result.success ? (result.data as any) : null;
}

export async function acceptInvitation(data: {
  token: string;
  mode: "password" | "oauth";
  password?: string;
  oauthProvider?: string;
  oauthProviderId?: string;
}): Promise<{ success: boolean; membershipId?: string; error?: string }> {
  const result = await saasClient.post<{ success: boolean; membershipId: string }>(
    "/invitations/accept",
    data,
  );
  return result.success ? (result.data ?? { success: false }) : { success: false, error: result.error };
}
