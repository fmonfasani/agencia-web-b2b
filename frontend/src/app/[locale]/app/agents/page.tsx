import { auth } from "@/lib/auth";
import { AgentCard } from "@/components/dashboard/AgentCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

const mockAgents = [
  {
    id: "1",
    name: "Recepción IA",
    type: "Recepción",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop",
    status: "online" as const,
    queries: 1243,
    latency: 245,
    errorRate: 0.2,
  },
  {
    id: "2",
    name: "Soporte IA",
    type: "Soporte",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop",
    status: "online" as const,
    queries: 892,
    latency: 312,
    errorRate: 0.1,
  },
  {
    id: "3",
    name: "Ventas IA",
    type: "Ventas",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop",
    status: "degraded" as const,
    queries: 45,
    latency: 890,
    errorRate: 2.5,
  },
];

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    throw new Error("No autenticado");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Mis Agentes</h1>
        <p className="text-gray-600">
          Monitorea el estado y rendimiento de tus agentes
        </p>
      </div>

      {/* Grid de Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAgents.map((agent) => (
          <Link key={agent.id} href={`/${locale}/app/agents/${agent.id}`} className="block hover:no-underline">
            <AgentCard
              {...agent}
              onConfig={() => {}}
              onMore={() => {}}
            />
          </Link>
        ))}
      </div>

      {/* Agregar nuevo agente */}
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
