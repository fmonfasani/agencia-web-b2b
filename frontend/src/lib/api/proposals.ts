/**
 * lib/api/proposals.ts
 * API functions for Proposal resource — delegates to backend-saas:8000
 */

import { saasClient } from "./api-client";

export interface ProposalApiRecord {
  id: string;
  tenantId: string;
  leadId: string;
  slug?: string;
  title?: string;
  problem?: string;
  solution?: string;
  deliverables?: string[];
  timeline?: string;
  investment?: string;
  roi?: string | null;
  content?: string;
  status?: string;
  sentAt?: string | null;
  viewedAt?: string | null;
  viewCount?: number;
  lead?: {
    id: string;
    name?: string | null;
    companyName?: string | null;
    email?: string | null;
    pipelineStatus?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ListProposalFilters {
  status?: string;
  leadId?: string;
}

export async function listProposals(
  tenantId: string,
  filters?: ListProposalFilters,
): Promise<ProposalApiRecord[]> {
  const params = new URLSearchParams({ tenantId });
  if (filters?.status) params.set("status", filters.status);
  if (filters?.leadId) params.set("leadId", filters.leadId);
  const result = await saasClient.get<ProposalApiRecord[]>(`/proposals?${params}`);
  return result.success ? (result.data ?? []) : [];
}

export async function getProposalById(proposalId: string): Promise<ProposalApiRecord | null> {
  const result = await saasClient.get<ProposalApiRecord>(`/proposals/${proposalId}`);
  return result.success ? (result.data ?? null) : null;
}

export async function getProposalBySlug(slug: string): Promise<ProposalApiRecord | null> {
  const result = await saasClient.get<ProposalApiRecord>(`/proposals/slug/${slug}`);
  return result.success ? (result.data ?? null) : null;
}

export async function generateProposal(
  tenantId: string,
  leadId: string,
  callNotes: string,
): Promise<ProposalApiRecord | null> {
  const result = await saasClient.post<ProposalApiRecord>("/proposals/generate", {
    tenantId,
    leadId,
    callNotes,
  });
  return result.success ? (result.data ?? null) : null;
}

export async function sendProposal(
  tenantId: string,
  proposalId: string,
): Promise<ProposalApiRecord | null> {
  const result = await saasClient.post<ProposalApiRecord>(`/proposals/${proposalId}/send`, {
    tenantId,
  });
  return result.success ? (result.data ?? null) : null;
}

export async function updateProposal(
  proposalId: string,
  data: Partial<ProposalApiRecord>,
): Promise<ProposalApiRecord | null> {
  const result = await saasClient.put<ProposalApiRecord>(`/proposals/${proposalId}`, data);
  return result.success ? (result.data ?? null) : null;
}
