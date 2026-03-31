/**
 * lib/api/leads.ts
 * API functions for Lead resource — delegates to backend-saas:8000
 */

import { saasClient } from "./api-client";

export interface LeadApiRecord {
  id: string;
  tenantId: string;
  name?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  status?: string;
  pipelineStatus?: string;
  sourceType?: string;
  potentialScore?: number | null;
  score?: number | null;
  priority?: string | null;
  category?: string | null;
  industry?: string | null;
  address?: string | null;
  description?: string | null;
  brief?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function getLeads(
  tenantId?: string,
  limit = 50,
  offset = 0,
): Promise<LeadApiRecord[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (tenantId) params.set("tenantId", tenantId);
  const result = await saasClient.get<LeadApiRecord[]>(`/leads?${params}`);
  return result.success ? (result.data ?? []) : [];
}

export async function getLeadById(leadId: string): Promise<LeadApiRecord | null> {
  const result = await saasClient.get<LeadApiRecord>(`/leads/${leadId}`);
  return result.success ? (result.data ?? null) : null;
}

export async function createLead(data: Partial<LeadApiRecord>): Promise<LeadApiRecord | null> {
  const result = await saasClient.post<LeadApiRecord>("/leads", data);
  return result.success ? (result.data ?? null) : null;
}

export async function updateLead(leadId: string, data: Partial<LeadApiRecord>): Promise<LeadApiRecord | null> {
  const result = await saasClient.put<LeadApiRecord>(`/leads/${leadId}`, data);
  return result.success ? (result.data ?? null) : null;
}

export async function countLeads(tenantId?: string): Promise<number> {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  const result = await saasClient.get<{ count: number }>(`/leads/count${params}`);
  return result.success ? (result.data?.count ?? 0) : 0;
}

export interface PipelineStats {
  total: number;
  byStatus: Record<string, number>;
  active: number;
}

export async function getPipelineStats(tenantId: string): Promise<PipelineStats> {
  const result = await saasClient.get<PipelineStats>(`/leads/pipeline/stats?tenantId=${tenantId}`);
  return result.success
    ? (result.data ?? { total: 0, byStatus: {}, active: 0 })
    : { total: 0, byStatus: {}, active: 0 };
}

export async function advancePipelineStatus(
  leadId: string,
  newStatus: string,
  metadata?: Record<string, unknown>,
): Promise<LeadApiRecord | null> {
  const result = await saasClient.post<LeadApiRecord>(`/leads/${leadId}/pipeline`, {
    status: newStatus,
    metadata,
  });
  return result.success ? (result.data ?? null) : null;
}

export async function getLeadsByStatus(
  tenantId: string,
  status: string,
  limit = 50,
): Promise<LeadApiRecord[]> {
  const result = await saasClient.get<LeadApiRecord[]>(
    `/leads?tenantId=${tenantId}&pipelineStatus=${status}&limit=${limit}`,
  );
  return result.success ? (result.data ?? []) : [];
}

export async function ingestLead(data: Record<string, unknown>): Promise<LeadApiRecord | null> {
  const result = await saasClient.post<LeadApiRecord>("/leads/ingest", data);
  return result.success ? (result.data ?? null) : null;
}
