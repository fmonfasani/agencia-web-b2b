"use server";

import { auth } from "@/lib/auth";
import { saasClientFor, SaasApiError } from "@/lib/saas-client";

export interface ActivityLog {
  id: string;
  date: string;
  user: string;
  action: string;
  resource: string;
  details?: string;
}

export interface ReportType {
  id: string;
  name: string;
  description: string;
  formats: ("csv" | "pdf" | "html")[];
  icon: string;
}

export async function getActivityLog(filters?: {
  user?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ActivityLog[]> {
  try {
    const session = await auth();
    const apiKey =
      (session?.user as any)?.apiKey || (session as any)?.backendApiKey;
    if (!apiKey) return [];

    const client = saasClientFor(apiKey);
    const traces = await client.agent.traces();

    let logs: ActivityLog[] = traces.map((t) => ({
      id: t.id,
      date: t.created_at,
      user: t.metadata?.tenant_id ?? "Sistema",
      action: "Ejecutó query",
      resource: t.query.length > 60 ? t.query.slice(0, 60) + "…" : t.query,
      details:
        t.success === false
          ? "Error en la ejecución"
          : `${t.iterations ?? 1} iteraciones · ${t.total_duration_ms ?? 0}ms`,
    }));

    if (filters?.action) {
      logs = logs.filter((l) =>
        l.action.toLowerCase().includes(filters.action!.toLowerCase()),
      );
    }
    if (filters?.startDate) {
      logs = logs.filter((l) => l.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      logs = logs.filter((l) => l.date <= filters.endDate! + "T23:59:59Z");
    }

    return logs;
  } catch (e) {
    if (!(e instanceof SaasApiError && e.status === 404))
      console.warn("[activity] getActivityLog:", e);
    return [];
  }
}

export async function generateReport(
  reportId: string,
  dateRange: { startDate: string; endDate: string },
  format: "csv" | "pdf" | "html",
): Promise<{ success: boolean; fileName?: string; error?: string }> {
  const validIds = ["usage", "billing", "performance"];
  if (!validIds.includes(reportId))
    return { success: false, error: "Tipo de reporte no encontrado" };

  // Report generation endpoint not yet implemented in backend
  // Simulate the file name so the UI can react
  await new Promise((r) => setTimeout(r, 800));
  const fileName = `${reportId}_${dateRange.startDate}_${dateRange.endDate}.${format}`;
  return { success: true, fileName };
}
