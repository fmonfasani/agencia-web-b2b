import { auth } from "@/lib/auth";
import { saasClientFor, SaasApiError } from "@/lib/saas-client";
import { AgentCard } from "@/components/dashboard/AgentCard";
import Link from "next/link";

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const apiKey =
    (session?.user as any)?.apiKey || (session as any)?.backendApiKey;

  // Fetch real agent config + metrics from backend
  let agentName = "Agente Principal";
  let agentDescription = "Agente IA configurado para tu negocio";
  let totalQueries = 0;
  let avgLatency = 0;
  let errorRate = 0;
  let agentStatus: "active" | "inactive" = "active";

  if (apiKey) {
    const client = saasClientFor(apiKey);
    try {
      const [config, metrics] = await Promise.allSettled([
        client.agent.config(),
        client.agent.metrics(),
      ]);

      if (config.status === "fulfilled") {
        agentName = config.value.nombre ?? agentName;
        agentDescription = config.value.descripcion ?? agentDescription;
      }

      if (metrics.status === "fulfilled") {
        const m = metrics.value;
        totalQueries = m.total_executions ?? 0;
        avgLatency = Math.round(m.avg_duration_ms ?? 0);
        errorRate = parseFloat(
          (
            ((m.error_count ?? 0) / Math.max(m.total_executions ?? 1, 1)) *
            100
          ).toFixed(1),
        );
        agentStatus = totalQueries > 0 ? "active" : "inactive";
      }
    } catch (e) {
      if (!(e instanceof SaasApiError && e.status === 404))
        console.warn("[agents] fetch:", e);
    }
  }

  // In the current architecture each tenant has exactly 1 agent
  const agents = [
    {
      id: "main",
      name: agentName,
      type: "IA Conversacional",
      status:
        agentStatus === "active" ? ("online" as const) : ("offline" as const),
      queries: totalQueries,
      latency: avgLatency,
      errorRate,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Mis Agentes</h1>
        <p className="text-gray-600">
          Monitorea el estado y rendimiento de tus agentes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/${locale}/app/agents/${agent.id}`}
            className="block hover:no-underline"
          >
            <AgentCard {...agent} />
          </Link>
        ))}
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
        <div className="text-4xl mb-4">➕</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Compra un nuevo agente
        </h3>
        <p className="text-gray-600 mb-4">
          Explora el marketplace y agrega nuevos agentes a tu plataforma
        </p>
        <a
          href={`/${locale}/app/marketplace`}
          className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Ir al Marketplace
        </a>
      </div>
    </div>
  );
}
