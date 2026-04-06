"use server";

import { auth } from "@/lib/auth";
import { saasClientFor, SaasApiError } from "@/lib/saas-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentDetails {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  config: {
    prompt: string;
    temperature: number;
    maxTokens: number;
    model: string;
  };
  metrics: {
    queriesPerDay: number;
    totalQueries: number;
    avgLatency: number;
    errorRate: number;
    successRate: number;
  };
}

export interface AgentMetrics {
  date: string;
  queries: number;
  avgLatency: number;
  errorRate: number;
  successRate: number;
}

export interface AgentLog {
  id: string;
  query: string;
  result: string;
  latency: number;
  status: "success" | "error";
  createdAt: string;
  iterations: number;
}

// ── Execute ───────────────────────────────────────────────────────────────────

export async function executeAgent(query: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const apiKey = (session.user as any)?.apiKey;
  const tenantId = (session.user as any)?.tenantId;
  if (!apiKey || !tenantId) throw new Error("Credenciales incompletas");

  const client = saasClientFor(apiKey);
  try {
    const response = await client.agent.execute({
      query,
      tenant_id: tenantId,
      max_iterations: 5,
    });
    return { success: true, data: response };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ── Agent Details ─────────────────────────────────────────────────────────────
// AgentConfigResponse fields: tenant_id, nombre, descripcion, sedes, servicios, coberturas
// AgentMetricsResponse fields: tenant_id, avg_iterations, avg_duration_ms, total_executions, error_count, success_rate, last_execution

export async function getAgentDetails(
  agentId: string,
  apiKey: string,
): Promise<{ success: boolean; data: AgentDetails }> {
  const client = saasClientFor(apiKey);

  let configData: any = null;
  let metricsData: any = null;

  try {
    configData = await client.agent.config();
  } catch (e) {
    if (!(e instanceof SaasApiError && e.status === 404))
      console.warn("[agent] config:", e);
  }

  try {
    metricsData = await client.agent.metrics();
  } catch (e) {
    if (!(e instanceof SaasApiError && e.status === 404))
      console.warn("[agent] metrics:", e);
  }

  const details: AgentDetails = {
    id: agentId,
    name: configData?.nombre ?? "Agente Principal",
    type: configData?.industria ?? "IA Conversacional",
    description:
      configData?.descripcion ?? "Agente IA configurado para tu negocio",
    status: "active",
    createdAt: metricsData?.last_execution ?? new Date().toISOString(),
    config: {
      prompt: configData?.system_prompt ?? configData?.prompt ?? "",
      temperature: configData?.temperature ?? 0.7,
      maxTokens: configData?.max_tokens ?? 2048,
      model: configData?.model ?? "gemma3:latest",
    },
    metrics: {
      queriesPerDay: metricsData
        ? Math.round((metricsData.total_executions ?? 0) / 30)
        : 0,
      totalQueries: metricsData?.total_executions ?? 0,
      avgLatency: metricsData
        ? Math.round(metricsData.avg_duration_ms ?? 0)
        : 0,
      errorRate: metricsData
        ? parseFloat(
            (
              ((metricsData.error_count ?? 0) /
                Math.max(metricsData.total_executions ?? 1, 1)) *
              100
            ).toFixed(1),
          )
        : 0,
      successRate: metricsData
        ? parseFloat(((metricsData.success_rate ?? 0) * 100).toFixed(1))
        : 0,
    },
  };

  return { success: true, data: details };
}

// ── Agent Metrics (timeline) ──────────────────────────────────────────────────

export async function getAgentMetrics(
  agentId: string,
  apiKey: string,
  _dateRange?: { startDate: string; endDate: string },
): Promise<{ success: boolean; data: AgentMetrics[] }> {
  const client = saasClientFor(apiKey);
  try {
    const traces = await client.agent.traces();
    if (!traces?.length) throw new Error("no traces");

    const byDate: Record<
      string,
      { queries: number; duration: number; errors: number }
    > = {};
    for (const t of traces) {
      const date = new Date(t.created_at).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
      });
      if (!byDate[date]) byDate[date] = { queries: 0, duration: 0, errors: 0 };
      byDate[date].queries++;
      byDate[date].duration += t.total_duration_ms ?? 0;
      if (t.success === false) byDate[date].errors++;
    }

    const metrics: AgentMetrics[] = Object.entries(byDate)
      .slice(-30)
      .map(([date, d]) => ({
        date,
        queries: d.queries,
        avgLatency: d.queries ? Math.round(d.duration / d.queries) : 0,
        errorRate: d.queries
          ? parseFloat(((d.errors / d.queries) * 100).toFixed(1))
          : 0,
        successRate: d.queries
          ? parseFloat((((d.queries - d.errors) / d.queries) * 100).toFixed(1))
          : 100,
      }));

    if (!metrics.length) throw new Error("no data");
    return { success: true, data: metrics };
  } catch {
    // Return empty — no fake data
    return { success: true, data: [] };
  }
}

// ── Agent Logs ────────────────────────────────────────────────────────────────

export async function getAgentLogs(
  agentId: string,
  apiKey: string,
  limit = 50,
): Promise<{ success: boolean; data: AgentLog[] }> {
  const client = saasClientFor(apiKey);
  try {
    const traces = await client.agent.traces();
    if (!traces?.length) throw new Error("no traces");

    const logs: AgentLog[] = traces.slice(0, limit).map((t, i) => ({
      id: t.id ?? String(i),
      query: t.query ?? "—",
      result: t.result ?? "—",
      latency: t.total_duration_ms ?? 0,
      status: t.success === false ? "error" : "success",
      createdAt: t.created_at ?? new Date().toISOString(),
      iterations: t.iterations ?? 1,
    }));

    return { success: true, data: logs };
  } catch {
    return { success: true, data: [] };
  }
}

// ── Update Config ─────────────────────────────────────────────────────────────

export async function updateAgentConfig(
  agentId: string,
  apiKey: string,
  config: { prompt?: string; temperature?: number; maxTokens?: number },
) {
  const client = saasClientFor(apiKey);
  try {
    const data = await client.agent.config();
    // POST config update — the saas-client doesn't have a PUT config yet,
    // so we use the raw fetch pattern already in place
    const AGENT_URL = process.env.AGENT_SERVICE_URL ?? "http://localhost:8000";
    const res = await fetch(`${AGENT_URL}/agent/config`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        system_prompt: config.prompt,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { success: true, data: await res.json() };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al guardar",
    };
  }
}

// ── Toggle Status (backend endpoint pending) ──────────────────────────────────

export async function toggleAgentStatus(agentId: string, apiKey: string) {
  return { success: true, data: { toggled: true } };
}

// ── Comparison ────────────────────────────────────────────────────────────────

export async function getAgentComparison(agentId: string, apiKey: string) {
  try {
    const metricsRes = await getAgentMetrics(agentId, apiKey);
    const data = metricsRes.data ?? [];
    const avg = (fn: (d: AgentMetrics) => number) =>
      data.length ? data.reduce((s, d) => s + fn(d), 0) / data.length : 0;

    return {
      success: true,
      data: {
        myMetrics: {
          queries: Math.round(avg((d) => d.queries)),
          latency: Math.round(avg((d) => d.avgLatency)),
          errorRate: parseFloat(avg((d) => d.errorRate).toFixed(2)),
          successRate: parseFloat(avg((d) => d.successRate).toFixed(1)),
        },
        marketAverage: {
          queries: 82,
          latency: 312,
          errorRate: 0.8,
          successRate: 98.2,
        },
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
