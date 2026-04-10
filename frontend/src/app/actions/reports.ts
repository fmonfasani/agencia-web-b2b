"use server";

import { auth } from "@/lib/auth";
import { saasClientFor, SaasApiError } from "@/lib/saas-client";
import type {
  ReportsUsageResponse,
  ReportsPerformanceResponse,
  AgentTrace,
} from "@/lib/saas-client";

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

async function getClient() {
  const session = await auth();
  const apiKey =
    (session?.user as any)?.apiKey || (session as any)?.backendApiKey;
  if (!apiKey) throw new Error("No API key in session");
  return saasClientFor(apiKey);
}

export async function getUsageReport(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<ReportsUsageResponse | null> {
  try {
    const client = await getClient();
    return await client.reports.usage({
      start_date: params?.startDate,
      end_date: params?.endDate,
    });
  } catch (e) {
    console.warn("[reports] getUsageReport:", e);
    return null;
  }
}

export async function getPerformanceReport(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<ReportsPerformanceResponse | null> {
  try {
    const client = await getClient();
    return await client.reports.performance({
      start_date: params?.startDate,
      end_date: params?.endDate,
    });
  } catch (e) {
    console.warn("[reports] getPerformanceReport:", e);
    return null;
  }
}

export async function getActivityLog(filters?: {
  user?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ActivityLog[]> {
  try {
    const client = await getClient();
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

    if (filters?.action)
      logs = logs.filter((l) =>
        l.action.toLowerCase().includes(filters.action!.toLowerCase()),
      );
    if (filters?.startDate)
      logs = logs.filter((l) => l.date >= filters.startDate!);
    if (filters?.endDate)
      logs = logs.filter((l) => l.date <= filters.endDate! + "T23:59:59Z");

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
): Promise<{
  success: boolean;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
}> {
  const validIds = ["usage", "performance", "traces"];
  if (!validIds.includes(reportId))
    return { success: false, error: "Tipo de reporte no encontrado" };

  if (format === "csv" && reportId !== "billing") {
    // CSV export is streamed directly — return URL for client to download
    const session = await auth();
    const apiKey =
      (session?.user as any)?.apiKey || (session as any)?.backendApiKey;
    if (!apiKey) return { success: false, error: "No autenticado" };

    const client = saasClientFor(apiKey);
    const downloadUrl = client.reports.exportCsvUrl(
      reportId as "usage" | "performance" | "traces",
      { start_date: dateRange.startDate, end_date: dateRange.endDate },
    );
    const fileName = `${reportId}_${dateRange.startDate}_${dateRange.endDate}.csv`;
    return { success: true, fileName, downloadUrl };
  }

  // PDF / HTML: placeholder while not implemented
  await new Promise((r) => setTimeout(r, 500));
  const fileName = `${reportId}_${dateRange.startDate}_${dateRange.endDate}.${format}`;
  return { success: true, fileName };
}
