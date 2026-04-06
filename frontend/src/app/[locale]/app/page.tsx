import { auth } from "@/lib/auth";
import { saasClientFor } from "@/lib/saas-client";
import { getClientDashboardData } from "@/app/actions/client";
import { KPICard } from "@/components/dashboard/KPICard";
import { AgentMetricsChart } from "@/components/dashboard/AgentMetricsChart";
import {
  StaggerContainer,
  StaggerItem,
  PageTransition,
} from "@/components/animations/PageTransition";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    throw new Error("No autenticado");
  }

  const apiKey = (session.user as any)?.apiKey;
  const tenantId = session.user?.tenantId;

  if (!apiKey || !tenantId) {
    throw new Error("Credenciales incompletas");
  }

  const client = saasClientFor(apiKey);

  // Obtener datos en paralelo
  const [tenantData, metricsData, onboardingStatus, dashboardData] =
    await Promise.allSettled([
      client.tenant.me(),
      client.agent.metrics(),
      client.onboarding.status(tenantId),
      getClientDashboardData(),
    ]);

  // Extraer datos seguros
  const tenant =
    tenantData.status === "fulfilled"
      ? tenantData.value
      : { tenant: { name: "Mi Empresa" } };
  const metrics =
    metricsData.status === "fulfilled"
      ? metricsData.value
      : {
          avg_iterations: 0,
          avg_duration_ms: 0,
          total_executions: 0,
          success_rate: 0,
        };
  const onboarding =
    onboardingStatus.status === "fulfilled" ? onboardingStatus.value : null;

  // Datos de dashboard con traces reales
  const dashboardInfo =
    dashboardData.status === "fulfilled"
      ? dashboardData.value
      : {
          tenantName: "Mi Empresa",
          metricsData: [],
          topAgentsData: [],
        };

  const metricsDataForChart =
    dashboardInfo.metricsData.length > 0
      ? dashboardInfo.metricsData
      : [
          { date: "1 abr", queries: 1200, avgDuration: 245, errorRate: 0.2 },
          { date: "2 abr", queries: 1900, avgDuration: 300, errorRate: 0.3 },
          { date: "3 abr", queries: 1700, avgDuration: 220, errorRate: 0.1 },
          { date: "4 abr", queries: 2200, avgDuration: 280, errorRate: 0.4 },
          { date: "5 abr", queries: 2290, avgDuration: 245, errorRate: 0.2 },
        ];

  const topClientsData =
    dashboardInfo.topAgentsData.length > 0
      ? dashboardInfo.topAgentsData
      : [
          { name: "Agente 1", mrr: 2400 },
          { name: "Agente 2", mrr: 1398 },
          { name: "Agente 3", mrr: 9800 },
        ];

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <StaggerItem>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Bienvenido, {dashboardInfo.tenantName || "Usuario"}
            </h1>
            <p className="text-gray-600">
              Monitorea tu plataforma de agentes IA en tiempo real
            </p>
          </div>
        </StaggerItem>

        {/* KPI Cards */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Queries Procesadas"
              value={metrics.total_executions || 0}
              trend={{ value: 12, isPositive: true }}
              icon="zap"
              color="blue"
            />
            <KPICard
              label="Latencia Promedio"
              value={`${metrics.avg_duration_ms || 0}ms`}
              trend={{ value: 5, isPositive: false }}
              icon="activity"
              color="yellow"
            />
            <KPICard
              label="Tasa de Éxito"
              value={`${((metrics.success_rate || 0) * 100).toFixed(1)}%`}
              trend={{ value: 3, isPositive: true }}
              icon="trending-up"
              color="green"
            />
            <KPICard
              label="Agentes Activos"
              value="3"
              trend={{ value: 0, isPositive: true }}
              icon="users"
              color="purple"
            />
          </div>
        </StaggerContainer>

        {/* Estado del Onboarding */}
        {onboarding && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-6">
            <h2 className="text-lg font-bold text-blue-900 mb-3">
              Estado del Onboarding
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-blue-700 mb-1">
                  Documentos Ingestionados
                </p>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${onboarding.postgresql ? 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
              <p className="text-sm text-blue-600">
                {onboarding.postgresql
                  ? "✅ Base de datos lista"
                  : "⏳ Cargando documentos..."}
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <AgentMetricsChart
          metricsData={metricsDataForChart}
          topClientsData={topClientsData}
        />

        {/* Quick Actions */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StaggerItem>
              <Link
                href={`/${locale}/app/chat`}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="text-3xl mb-2">💬</div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Chat IA
                </h3>
                <p className="text-sm text-gray-600">
                  Consulta directamente con tu agente
                </p>
              </Link>
            </StaggerItem>

            <StaggerItem>
              <Link
                href={`/${locale}/app/agents`}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="text-3xl mb-2">🤖</div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Mis Agentes
                </h3>
                <p className="text-sm text-gray-600">
                  Gestiona y configura tus agentes
                </p>
              </Link>
            </StaggerItem>

            <StaggerItem>
              <Link
                href={`/${locale}/app/marketplace`}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="text-3xl mb-2">🛍️</div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Marketplace
                </h3>
                <p className="text-sm text-gray-600">Descubre nuevos agentes</p>
              </Link>
            </StaggerItem>
          </div>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}
