/**
 * lib/api/metrics.ts
 * API functions for Metrics / Observability — delegates to backend-agents:8001 and backend-saas:8000
 */

import { saasClient, agentsClient } from "./api-client";

export interface MetricEvent {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface DashboardMetrics {
  activeLeads: number;
  totalDeals: number;
  closedWonDeals: number;
  conversionRate: number;
  mrrFromDeals: number;
  totalMrr: number;
  agentCount: number;
  userCount: number;
  customerCount: number;
  dealsByHuman: number;
  dealsByAgent: number;
  avgDaysToClose: number;
  recentEvents: Array<{ type: string; createdAt: string; source: string }>;
  revenueHistory: Array<{ date: string; revenue: number }>;
}

/**
 * Records a metric event — fire and forget.
 * Falls back silently on error to avoid disrupting main request flow.
 */
export async function recordMetric(event: MetricEvent): Promise<void> {
  try {
    await saasClient.post("/metrics", event);
  } catch {
    // Intentionally silent — observability must not break app
  }
}

export function incrementCounter(name: string, tags?: Record<string, string>): void {
  void recordMetric({ name, value: 1, timestamp: Date.now(), tags });
}

export function recordValue(name: string, value: number, tags?: Record<string, string>): void {
  void recordMetric({ name, value, timestamp: Date.now(), tags });
}

export async function getObservabilityMetrics(): Promise<any[]> {
  const result = await saasClient.get<any[]>("/metrics");
  return result.success ? (result.data ?? []) : [];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics | null> {
  const result = await saasClient.get<DashboardMetrics>("/metrics/dashboard");
  return result.success ? (result.data ?? null) : null;
}

export async function getAgentMetrics(): Promise<any> {
  const result = await agentsClient.get("/metrics/agent");
  return result.success ? result.data : null;
}

export async function logBusinessMetric(data: {
  tenantId: string;
  type: string;
  status: string;
  value?: number;
  metadata?: unknown;
}): Promise<void> {
  try {
    await saasClient.post("/metrics/business", data);
  } catch {
    // Intentionally silent
  }
}
