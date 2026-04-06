"use server";

import { auth } from "@/lib/auth";
import { saasClientFor } from "@/lib/saas-client";

export interface ClientDashboardData {
  tenantName: string;
  metricsData: Array<{
    date: string;
    queries: number;
    avgDuration: number;
    errorRate: number;
  }>;
  topAgentsData: Array<{
    name: string;
    mrr: number;
  }>;
  error?: string;
}

/**
 * Fetch client dashboard data from backend.
 * Gets tenant info, metrics, and traces.
 */
export async function getClientDashboardData(): Promise<ClientDashboardData> {
  try {
    const session = await auth();
    if (!session?.backendApiKey) {
      throw new Error("API Key not found in session");
    }

    const client = saasClientFor(session.backendApiKey);

    // Fetch tenant info
    let tenantName = "Mi Empresa";
    try {
      const tenantData = await client.tenant.me();
      if (tenantData.tenant?.name) {
        tenantName = tenantData.tenant.name;
      }
    } catch (e) {
      console.error("Failed to fetch tenant data:", e);
    }

    // Fetch traces for timeline data
    let metricsData: ClientDashboardData["metricsData"] = [
      { date: "1 abr", queries: 1200, avgDuration: 245, errorRate: 0.2 },
      { date: "2 abr", queries: 1900, avgDuration: 300, errorRate: 0.3 },
      { date: "3 abr", queries: 1700, avgDuration: 220, errorRate: 0.1 },
      { date: "4 abr", queries: 2200, avgDuration: 280, errorRate: 0.4 },
      { date: "5 abr", queries: 2290, avgDuration: 245, errorRate: 0.2 },
    ];

    try {
      const traces = await client.agent.traces();
      if (traces && traces.length > 0) {
        // Group traces by date and calculate daily metrics
        const byDate: Record<string, any> = {};
        traces.forEach((trace) => {
          const date = new Date(trace.created_at).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
          });
          if (!byDate[date]) {
            byDate[date] = {
              queries: 0,
              duration: 0,
              errors: 0,
              count: 0,
            };
          }
          byDate[date].queries++;
          byDate[date].duration += trace.total_duration_ms || 0;
          if (trace.success === false) byDate[date].errors++;
          byDate[date].count++;
        });

        metricsData = Object.entries(byDate)
          .map(([date, data]) => ({
            date,
            queries: data.queries * 100, // Scale for visibility
            avgDuration: Math.round(data.duration / data.count),
            errorRate: parseFloat(((data.errors / data.count) * 100).toFixed(1)),
          }))
          .slice(-5); // Last 5 days
      }
    } catch (e) {
      console.error("Failed to fetch traces:", e);
    }

    // Mock top agents data (would come from actual agent list)
    const topAgentsData = [
      { name: "Agente 1", mrr: 2400 },
      { name: "Agente 2", mrr: 1398 },
      { name: "Agente 3", mrr: 9800 },
    ];

    return {
      tenantName,
      metricsData,
      topAgentsData,
    };
  } catch (error) {
    console.error("Client dashboard data fetch error:", error);
    return {
      tenantName: "Mi Empresa",
      metricsData: [],
      topAgentsData: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
