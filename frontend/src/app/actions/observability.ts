"use server";

import { auth } from "@/lib/auth";
import { saasClientFor } from "@/lib/saas-client";

export async function getObservabilityData(filterTenantId?: string) {
  const session = await auth();
  if (!session?.user) return null;

  const apiKey = (session.user as any)?.apiKey;
  if (!apiKey) return null;

  const userRole = ((session.user as any)?.role ?? "").toUpperCase();
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "ANALISTA"].includes(userRole);

  const client = saasClientFor(apiKey);

  const [configRes, tracesRes, metricsRes] = await Promise.allSettled([
    client.agent.config(),
    isAdmin
      ? client.agent.tracesAdmin({ limit: 100, tenantId: filterTenantId })
      : client.agent.traces(),
    client.agent.metrics(isAdmin ? filterTenantId : undefined),
  ]);

  const config = configRes.status === "fulfilled" ? configRes.value : null;
  const traces =
    tracesRes.status === "fulfilled" ? (tracesRes.value ?? []) : [];
  const metrics = metricsRes.status === "fulfilled" ? metricsRes.value : null;

  // Collect unique tenant IDs for admin tenant selector
  const tenantIds: string[] = isAdmin
    ? [
        ...new Set(
          (traces as any[]).map((t: any) => t.tenant_id).filter(Boolean),
        ),
      ]
    : [];

  return {
    agentName: config?.nombre ?? "Mi Agente",
    isAdmin,
    traces: Array.isArray(traces) ? traces : [],
    metrics,
    tenantIds,
    selectedTenant: filterTenantId ?? null,
  };
}
