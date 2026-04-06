import { auth } from "@/lib/auth";
import { AgentMetricsChart } from "@/components/dashboard/AgentMetricsChart";

export const dynamic = "force-dynamic";

export default async function ObservabilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    throw new Error("No autenticado");
  }

  // Datos mock
  const metricsData = [
    { date: "1 abr", queries: 1200, avgDuration: 245, errorRate: 0.2 },
    { date: "2 abr", queries: 1900, avgDuration: 300, errorRate: 0.3 },
    { date: "3 abr", queries: 1700, avgDuration: 220, errorRate: 0.1 },
    { date: "4 abr", queries: 2200, avgDuration: 280, errorRate: 0.4 },
    { date: "5 abr", queries: 2290, avgDuration: 245, errorRate: 0.2 },
  ];

  const topClientsData = [
    { name: "Recepción", mrr: 2400 },
    { name: "Soporte", mrr: 1398 },
    { name: "Ventas", mrr: 980 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Observabilidad
        </h1>
        <p className="text-gray-600">
          Monitorea el rendimiento y salud de tus agentes
        </p>
      </div>

      {/* Charts */}
      <AgentMetricsChart
        metricsData={metricsData}
        topClientsData={topClientsData}
      />

      {/* Recent Queries */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Últimas Consultas
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Consulta
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Resultado
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Duración
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">¿Cuál es el horario de atención?</td>
                <td className="py-3 px-4 text-gray-600">9:00 a 18:00</td>
                <td className="py-3 px-4">245ms</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    ✓ Exitoso
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">Necesito hablar con un agente</td>
                <td className="py-3 px-4 text-gray-600">Te trasferimos...</td>
                <td className="py-3 px-4">312ms</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    ✓ Exitoso
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">Consulta compleja que no entiende</td>
                <td className="py-3 px-4 text-gray-600">Error procesando</td>
                <td className="py-3 px-4">890ms</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                    ✗ Error
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
