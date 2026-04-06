"use server";

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

const mockActivity: ActivityLog[] = [
  {
    id: "a1",
    date: "2026-04-06T14:32:00Z",
    user: "Admin Principal",
    action: "Configuró agente",
    resource: "Recepción IA Pro",
    details: "Cambió temperatura a 0.8",
  },
  {
    id: "a2",
    date: "2026-04-06T10:15:00Z",
    user: "María García",
    action: "Compró agente",
    resource: "Ventas IA Enterprise",
    details: "Plan anual - $1,290",
  },
  {
    id: "a3",
    date: "2026-04-05T22:01:00Z",
    user: "Carlos Méndez",
    action: "Invitó miembro",
    resource: "nuevo@empresa.com",
    details: "Rol: Analyst",
  },
  {
    id: "a4",
    date: "2026-04-05T18:45:00Z",
    user: "Admin Principal",
    action: "Creó webhook",
    resource: "Alertas Producción",
    details: "3 eventos configurados",
  },
  {
    id: "a5",
    date: "2026-04-05T12:00:00Z",
    user: "María García",
    action: "Exportó reporte",
    resource: "Usage Report - Marzo",
    details: "CSV - 145 filas",
  },
  {
    id: "a6",
    date: "2026-04-04T09:30:00Z",
    user: "Carlos Méndez",
    action: "Actualizó rol",
    resource: "Nuevo Usuario",
    details: "Viewer → Analyst",
  },
  {
    id: "a7",
    date: "2026-04-03T17:10:00Z",
    user: "Admin Principal",
    action: "Desactivó agente",
    resource: "Soporte IA Premium",
    details: "Mantenimiento programado",
  },
  {
    id: "a8",
    date: "2026-04-02T11:00:00Z",
    user: "Admin Principal",
    action: "Activó agente",
    resource: "Soporte IA Premium",
    details: "Mantenimiento finalizado",
  },
];

export async function getActivityLog(filters?: {
  user?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ActivityLog[]> {
  let logs = mockActivity;

  if (filters?.user) {
    logs = logs.filter((l) =>
      l.user.toLowerCase().includes(filters.user!.toLowerCase()),
    );
  }
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
}

export async function generateReport(
  reportId: string,
  dateRange: { startDate: string; endDate: string },
  format: "csv" | "pdf" | "html",
): Promise<{ success: boolean; fileName?: string; error?: string }> {
  // Simula generación del archivo
  await new Promise((r) => setTimeout(r, 1500));

  const validIds = ["usage", "billing", "performance"];
  if (!validIds.includes(reportId))
    return { success: false, error: "Tipo de reporte no encontrado" };

  const fileName = `${reportId}_${dateRange.startDate}_${dateRange.endDate}.${format}`;
  return { success: true, fileName };
}
