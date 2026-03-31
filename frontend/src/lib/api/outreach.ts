/**
 * lib/api/outreach.ts
 * API functions for Outreach Campaigns resource — delegates to backend-saas:8000
 */

import { saasClient } from "./api-client";

export interface OutreachCampaignRecord {
  id: string;
  tenantId: string;
  name: string;
  channel: string;
  template?: string | null;
  status: string;
  createdAt?: string;
  _count?: { messages: number };
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export async function getCampaigns(tenantId: string): Promise<OutreachCampaignRecord[]> {
  const result = await saasClient.get<OutreachCampaignRecord[]>(
    `/outreach/campaigns?tenantId=${tenantId}`,
  );
  return result.success ? (result.data ?? []) : [];
}

export async function createCampaign(data: {
  tenantId: string;
  name: string;
  channel: string;
  template?: string;
}): Promise<OutreachCampaignRecord | null> {
  const result = await saasClient.post<OutreachCampaignRecord>("/outreach/campaigns", data);
  return result.success ? (result.data ?? null) : null;
}

export async function enrollLeads(
  campaignId: string,
  leadIds: string[],
): Promise<unknown[] | null> {
  const result = await saasClient.post<unknown[]>(`/outreach/campaigns/${campaignId}/enroll`, {
    leadIds,
  });
  return result.success ? (result.data ?? null) : null;
}

export async function processCampaign(campaignId: string): Promise<void> {
  await saasClient.post(`/outreach/campaigns/${campaignId}/process`, {});
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const result = await saasClient.get<CampaignStats>(
    `/outreach/campaigns/${campaignId}/stats`,
  );
  return result.success
    ? (result.data ?? { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 })
    : { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
}
