import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export const dynamic = "force-dynamic";

const mockAgents = [
  {
    id: "1",
    name: "Recepción IA Pro",
    description: "Agente especializado en atención telefónica y recepción",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop",
    rating: 4.8,
    reviewCount: 124,
    price: 99,
    isPopular: true,
    isNew: false,
  },
  {
    id: "2",
    name: "Soporte IA Premium",
    description: "Agente de soporte al cliente con IA avanzada",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop",
    rating: 4.6,
    reviewCount: 89,
    price: 79,
    isPopular: false,
    isNew: false,
  },
  {
    id: "3",
    name: "Ventas IA Enterprise",
    description: "Agente de ventas con seguimiento automático",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop",
    rating: 4.9,
    reviewCount: 201,
    price: 129,
    isPopular: true,
    isNew: true,
  },
  {
    id: "4",
    name: "Asistente Legal IA",
    description: "Asistente especializado para consultas legales",
    image: "https://images.unsplash.com/photo-1567427361324-1c2a59a6baad?w=200&h=200&fit=crop",
    rating: 4.7,
    reviewCount: 45,
    price: 149,
    isPopular: false,
    isNew: true,
  },
  {
    id: "5",
    name: "Análisis de Datos IA",
    description: "Agente para análisis y reportes de datos",
    image: "https://images.unsplash.com/photo-1551082407-5ddc1d3049c8?w=200&h=200&fit=crop",
    rating: 4.5,
    reviewCount: 67,
    price: 109,
    isPopular: false,
    isNew: false,
  },
  {
    id: "6",
    name: "Marketing IA Avanzado",
    description: "Agente para estrategias y campañas de marketing",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop",
    rating: 4.4,
    reviewCount: 92,
    price: 119,
    isPopular: false,
    isNew: false,
  },
];

export default async function MarketplacePage({
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Marketplace de Agentes
        </h1>
        <p className="text-gray-600">
          Descubre y compra agentes IA especializados para tu negocio
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar agentes..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
          <option>Todos los tipos</option>
          <option>Recepción</option>
          <option>Soporte</option>
          <option>Ventas</option>
          <option>Legal</option>
          <option>Marketing</option>
        </select>
        <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
          <option>Todos los precios</option>
          <option>$0 - $100</option>
          <option>$100 - $150</option>
          <option>$150+</option>
        </select>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAgents.map((agent) => (
          <div
            key={agent.id}
            className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Image */}
            <div className="relative h-48 bg-gray-100 overflow-hidden group">
              <Image
                src={agent.image}
                alt={agent.name}
                width={200}
                height={200}
                className="object-cover w-full h-full group-hover:opacity-75 transition-opacity"
              />
              {agent.isPopular && (
                <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
                  Popular
                </Badge>
              )}
              {agent.isNew && (
                <Badge className="absolute top-2 right-2 bg-green-500 hover:bg-green-600">
                  Nuevo
                </Badge>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {agent.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3">{agent.description}</p>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                <span className="text-yellow-500">⭐ {agent.rating}</span>
                <span className="text-sm text-gray-500">
                  ({agent.reviewCount})
                </span>
              </div>

              {/* Price & CTA */}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-600">
                  ${agent.price}
                </span>
                <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Ver detalles
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
