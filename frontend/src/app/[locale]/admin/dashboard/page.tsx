import { requireTenantMembership } from "@/lib/authz";
import { saasClientFor } from "@/lib/saas-client";
import { KPICard } from "@/components/dashboard/KPICard";
import { AgentMetricsChart } from "@/components/dashboard/AgentMetricsChart";
import { SystemHealth } from "@/components/dashboard/SystemHealth";
import {
  Users,
  DollarSign,
  Zap,
  TrendingUp,
  Activity,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user, tenantId } = await requireTenantMembership();

  const userId =
    (user as { id?: string; userId?: string })?.id ??
    (user as { id?: string; userId?: string })?.userId;

  if (!userId || !tenantId) {
    throw new Error("TENANT_CONTEXT_REQUIRED");
  }

  // Este endpoint requiere API key como admin
  // Por ahora, usamos datos mock
  const mockMetricsData = [
    { date: "1 abr", queries: 12000, avgDuration: 245, errorRate: 0.2 },
    { date: "2 abr", queries: 19000, avgDuration: 300, errorRate: 0.3 },
    { date: "3 abr", queries: 17000, avgDuration: 220, errorRate: 0.1 },
    { date: "4 abr", queries: 22000, avgDuration: 280, errorRate: 0.4 },
    { date: "5 abr", queries: 22900, avgDuration: 245, errorRate: 0.2 },
  ];

  const mockTopClientsData = [
    { name: "Cliente A", mrr: 24000 },
    { name: "Cliente B", mrr: 18000 },
    { name: "Cliente C", mrr: 15000 },
    { name: "Cliente D", mrr: 12000 },
    { name: "Cliente E", mrr: 9800 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dashboard Admin
          </h1>
          <p className="text-gray-600">
            Gestión y monitoreo de la plataforma Webshooks
          </p>
        </div>
        <Link
          href={`/${locale}/admin/settings`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Configuración
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          label="Clientes Activos"
          value="247"
          trend={{ value: 12, isPositive: true }}
          icon={Users}
          color="blue"
        />
        <KPICard
          label="Revenue MRR"
          value="$124,560"
          trend={{ value: 8, isPositive: true }}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          label="Queries Hoy"
          value="12,456"
          trend={{ value: 3, isPositive: false }}
          icon={Zap}
          color="yellow"
        />
        <KPICard
          label="Uptime Platform"
          value="99.98%"
          trend={{ value: 0.02, isPositive: true }}
          icon={Activity}
          color="green"
        />
        <KPICard
          label="Agentes en Producción"
          value="45"
          trend={{ value: 5, isPositive: true }}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* System Health */}
      <SystemHealth
        status={{
          PostgreSQL: true,
          Qdrant: true,
          Ollama: true,
          Redis: true,
        }}
      />

      {/* Charts */}
      <AgentMetricsChart
        metricsData={mockMetricsData}
        topClientsData={mockTopClientsData}
      />

      {/* Recent Activity */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Actividad Reciente
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-4 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              ✚
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Nuevo cliente registrado
              </p>
              <p className="text-xs text-gray-500">
                Tech Innovations Inc. hace 2 horas
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              ✓
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Agente vendido
              </p>
              <p className="text-xs text-gray-500">
                Cliente B compró "Soporte IA Premium" hace 4 horas
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
              ⚠
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Agente degradado
              </p>
              <p className="text-xs text-gray-500">
                "Recepción IA" latencia alta hace 1 hora
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              ✕
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Cliente canceló suscripción
              </p>
              <p className="text-xs text-gray-500">
                Cliente D canceló hace 6 horas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
