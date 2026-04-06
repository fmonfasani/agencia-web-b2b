"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Users, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { getMarketplaceAgents, purchaseAgent } from "@/app/actions/marketplace";
import { PageTransition, StaggerItem } from "@/components/animations/PageTransition";
import { useToast } from "@/components/ui/toast";
import type { MarketplaceAgent } from "@/app/actions/marketplace";

export default function MarketplacePage() {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [priceFilter, setPriceFilter] = useState("Todos los precios");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const { addToast } = useToast();

  // Fetch agents on mount
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await getMarketplaceAgents();
        setAgents(data);
      } catch (error) {
        addToast("No se pudieron cargar los agentes", "error");
      } finally {
        setLoading(false);
      }
    };
    loadAgents();
  }, [addToast]);

  // Filter agents based on criteria
  const filteredAgents = agents.filter((agent) => {
    // Search filter
    if (
      searchTerm &&
      !agent.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !agent.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Category filter
    if (categoryFilter !== "Todos" && agent.category !== categoryFilter) {
      return false;
    }

    // Price filter
    if (priceFilter !== "Todos los precios") {
      if (priceFilter === "$0 - $100" && agent.price > 100) return false;
      if (priceFilter === "$100 - $150" && (agent.price < 100 || agent.price > 150))
        return false;
      if (priceFilter === "$150+" && agent.price < 150) return false;
    }

    return true;
  });

  // Get unique categories
  const categories = ["Todos", ...new Set(agents.map((a) => a.category))];

  const handlePurchase = async (agentId: string) => {
    setPurchasingId(agentId);
    try {
      const result = await purchaseAgent(agentId);
      if (result.success) {
        addToast(
          `Agente comprado exitosamente. ID: ${result.subscriptionId}`,
          "success"
        );
      } else {
        addToast(result.error || "Error al comprar el agente", "error");
      }
    } catch (error) {
      addToast("Error al procesar la compra", "error");
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <StaggerItem>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Marketplace de Agentes IA
            </h1>
            <p className="text-gray-600">
              Descubre y compra agentes IA especializados para tu negocio
            </p>
          </div>
        </StaggerItem>

        {/* Search & Filters */}
        <StaggerItem>
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Buscar agentes por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option>Todos los precios</option>
              <option>$0 - $100</option>
              <option>$100 - $150</option>
              <option>$150+</option>
            </select>
          </div>
        </StaggerItem>

        {/* Results count */}
        {!loading && (
          <StaggerItem>
            <p className="text-sm text-gray-600">
              Se encontraron {filteredAgents.length} agente
              {filteredAgents.length !== 1 ? "s" : ""}
            </p>
          </StaggerItem>
        )}

        {/* Agent Grid */}
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="h-48 bg-gray-200 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 bg-gray-200 rounded animate-pulse" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-gray-500 text-lg">
                No se encontraron agentes con los filtros seleccionados
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              {filteredAgents.map((agent) => (
                <motion.div
                  key={agent.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gray-100 overflow-hidden group">
                    <Image
                      src={agent.image}
                      alt={agent.name}
                      width={400}
                      height={300}
                      className="object-cover w-full h-full group-hover:opacity-75 transition-opacity"
                    />
                    <div className="absolute top-2 left-2 flex gap-2 flex-wrap">
                      {agent.isPopular && (
                        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Popular
                        </div>
                      )}
                      {agent.isNew && (
                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Nuevo
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 flex-1">
                      {agent.description}
                    </p>

                    {/* Category */}
                    <p className="text-xs text-blue-600 font-medium mb-3">
                      {agent.category}
                    </p>

                    {/* Features */}
                    {agent.features && agent.features.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {agent.features.slice(0, 3).map((feature, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                        {agent.features.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{agent.features.length - 3} más
                          </span>
                        )}
                      </div>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3">
                      <div className="flex items-center">
                        <Star
                          size={16}
                          className="fill-yellow-400 text-yellow-400"
                        />
                      </div>
                      <span className="font-semibold text-gray-900">
                        {agent.rating}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({agent.reviewCount})
                      </span>
                    </div>

                    {/* Monthly Users */}
                    {agent.monthlyUsers && (
                      <div className="flex items-center gap-1 mb-4 text-xs text-gray-600">
                        <Users size={14} />
                        <span>{agent.monthlyUsers.toLocaleString()} usuarios/mes</span>
                      </div>
                    )}

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Precio</p>
                        <p className="text-2xl font-bold text-blue-600">
                          ${agent.price}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePurchase(agent.id)}
                        disabled={purchasingId === agent.id}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {purchasingId === agent.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Comprando...
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={16} />
                            Comprar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
