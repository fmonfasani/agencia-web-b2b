"use server";

import { auth } from "@/lib/auth";
import { saasClientFor, SaasApiError } from "@/lib/saas-client";

export interface ClientDashboardData {
  tenantName: string;
  tenantId: string;
  metricsData: Array<{
    date: string;
    queries: number;
    avgDuration: number;
    errorRate: number;
  }>;
  kpis: {
    totalExecutions: number;
    avgDurationMs: number;
    successRate: number;
    errorCount: number;
  };
  topAgentsData: Array<{
    name: string;
    mrr: number;
  }>;
  agentConfig?: {
    nombre?: string;
    descripcion?: string;
  };
  error?: string;
}

export async function getClientDashboardData(): Promise<ClientDashboardData> {
  const empty: ClientDashboardData = {
    tenantName: "Mi Empresa",
    tenantId: "",
    metricsData: [],
    kpis: {
      totalExecutions: 0,
      avgDurationMs: 0,
      successRate: 0,
      errorCount: 0,
    },
    topAgentsData: [],
  };

  try {
    const session = await auth();
    const apiKey =
      (session?.user as any)?.apiKey || (session as any)?.backendApiKey;
    if (!apiKey) throw new Error("API Key not found in session");

    const client = saasClientFor(apiKey);

    // ── Tenant info ──────────────────────────────────────────────────────────
    let tenantName = "Mi Empresa";
    let tenantId = "";
    try {
      const t = await client.tenant.me();
      tenantName = t.nombre ?? tenantName;
      tenantId = t.id ?? "";
    } catch (e) {
      if (!(e instanceof SaasApiError && e.status === 404))
        console.warn("[dashboard] tenant.me:", e);
    }

    // ── Agent metrics (KPIs) ─────────────────────────────────────────────────
    let kpis: ClientDashboardData["kpis"] = {
      totalExecutions: 0,
      avgDurationMs: 0,
      successRate: 0,
      errorCount: 0,
    };
    try {
      const m = await client.agent.metrics();
      kpis = {
        totalExecutions: m.total_executions ?? 0,
        avgDurationMs: Math.round(m.avg_duration_ms ?? 0),
        successRate: parseFloat(((m.success_rate ?? 0) * 100).toFixed(1)),
        errorCount: m.error_count ?? 0,
      };
    } catch (e) {
      if (!(e instanceof SaasApiError && e.status === 404))
        console.warn("[dashboard] agent.metrics:", e);
    }

    // ── Agent config (for agent name in widgets) ─────────────────────────────
    let agentConfig: ClientDashboardData["agentConfig"];
    try {
      const cfg = await client.agent.config();
      agentConfig = { nombre: cfg.nombre, descripcion: cfg.descripcion };
    } catch (e) {
      if (!(e instanceof SaasApiError && e.status === 404))
        console.warn("[dashboard] agent.config:", e);
    }

    // ── Traces → daily timeline chart ────────────────────────────────────────
    let metricsData: ClientDashboardData["metricsData"] = [];
    try {
      const traces = await client.agent.traces();
      if (traces?.length) {
        const byDate: Record<
          string,
          { queries: number; duration: number; errors: number; count: number }
        > = {};
        for (const trace of traces) {
          const date = new Date(trace.created_at).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
          });
          if (!byDate[date])
            byDate[date] = { queries: 0, duration: 0, errors: 0, count: 0 };
          byDate[date].queries++;
          byDate[date].duration += trace.total_duration_ms ?? 0;
          if (trace.success === false) byDate[date].errors++;
          byDate[date].count++;
        }
        metricsData = Object.entries(byDate)
          .slice(-14)
          .map(([date, d]) => ({
            date,
            queries: d.queries,
            avgDuration: d.count ? Math.round(d.duration / d.count) : 0,
            errorRate: d.count
              ? parseFloat(((d.errors / d.count) * 100).toFixed(1))
              : 0,
          }));
      }
    } catch (e) {
      if (!(e instanceof SaasApiError && e.status === 404))
        console.warn("[dashboard] agent.traces:", e);
    }

    // topAgentsData — single agent in current architecture
    const topAgentsData = agentConfig?.nombre
      ? [{ name: agentConfig.nombre, mrr: kpis.totalExecutions }]
      : [];

    return {
      tenantName,
      tenantId,
      metricsData,
      kpis,
      topAgentsData,
      agentConfig,
    };
  } catch (error) {
    console.error("[dashboard] fatal:", error);
    return {
      ...empty,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
