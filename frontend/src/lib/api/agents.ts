/**
 * lib/api/agents.ts
 * API functions for AI Agents resource — delegates to backend-agents:8001 and backend-saas:8000
 */

import { saasClient, agentsClient } from "./api-client";

export interface AgentRecord {
  id: string;
  tenantId: string;
  name: string;
  systemPrompt?: string;
  type?: string;
  channel?: string;
  assistantId?: string | null;
  promptConfig?: string | null;
  knowledgeBase?: string | null;
  active: boolean;
  createdAt?: string;
}

export interface AgentExecuteRequest {
  query: string;
  tenantId: string;
  agentId?: string;
  sessionId?: string;
}

export interface AgentResponse {
  trace_id: string;
  query: string;
  result: string;
  metadata?: Record<string, unknown>;
}

export async function getAgents(tenantId: string): Promise<AgentRecord[]> {
  const result = await saasClient.get<{ agents: AgentRecord[] }>(
    `/agents?tenantId=${tenantId}`,
  );
  return result.success ? (result.data?.agents ?? []) : [];
}

export async function createAgent(data: Partial<AgentRecord>): Promise<AgentRecord | null> {
  const result = await saasClient.post<{ agent: AgentRecord }>("/agents", data);
  return result.success ? (result.data?.agent ?? null) : null;
}

export async function updateAgent(
  agentId: string,
  data: Partial<AgentRecord>,
): Promise<AgentRecord | null> {
  const result = await saasClient.put<{ agent: AgentRecord }>(`/agents/${agentId}`, data);
  return result.success ? (result.data?.agent ?? null) : null;
}

export async function deleteAgent(agentId: string): Promise<boolean> {
  const result = await saasClient.delete(`/agents/${agentId}`);
  return result.success;
}

export async function executeAgent(request: AgentExecuteRequest): Promise<AgentResponse | null> {
  const result = await agentsClient.post<AgentResponse>("/agent/execute", request);
  return result.success ? (result.data ?? null) : null;
}

export async function getAgentTraces(
  tenantId?: string,
  limit = 50,
): Promise<any[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (tenantId) params.set("tenantId", tenantId);
  const result = await agentsClient.get<any[]>(`/agent/traces?${params}`);
  return result.success ? (result.data ?? []) : [];
}
