"use server";

export interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  price: number;
  isPopular: boolean;
  isNew: boolean;
  features: string[];
  monthlyUsers: number;
}

/**
 * Obtener lista de agentes disponibles en el marketplace
 * Por ahora retorna mock data, pero se puede conectar a un endpoint real
 */
export async function getMarketplaceAgents(
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
  }
): Promise<MarketplaceAgent[]> {
  // Mock data - en producción vendría de un endpoint real
  const agents: MarketplaceAgent[] = [
    {
      id: "agent-recepcion-pro",
      name: "Recepción IA Pro",
      description: "Agente especializado en atención telefónica y recepción con soporte multiidioma",
      category: "Atención al Cliente",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
      rating: 4.8,
      reviewCount: 234,
      price: 99,
      isPopular: true,
      isNew: false,
      features: ["Multiidioma", "Integración CRM", "Reporte de llamadas", "IVR avanzado"],
      monthlyUsers: 1240,
    },
    {
      id: "agent-soporte-premium",
      name: "Soporte IA Premium",
      description: "Agente de soporte al cliente con IA avanzada y resolución automática",
      category: "Soporte",
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop",
      rating: 4.6,
      reviewCount: 156,
      price: 79,
      isPopular: false,
      isNew: false,
      features: ["Análisis de sentimiento", "Auto-resolución", "Escalado inteligente", "Analytics"],
      monthlyUsers: 890,
    },
    {
      id: "agent-ventas-enterprise",
      name: "Ventas IA Enterprise",
      description: "Agente de ventas con seguimiento automático y predicción de conversión",
      category: "Ventas",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
      rating: 4.9,
      reviewCount: 312,
      price: 129,
      isPopular: true,
      isNew: true,
      features: ["Lead scoring", "Pipeline management", "Forecast IA", "Integraciones CRM"],
      monthlyUsers: 2150,
    },
    {
      id: "agent-legal-assistant",
      name: "Asistente Legal IA",
      description: "Asistente especializado para consultas legales y análisis de documentos",
      category: "Legal",
      image: "https://images.unsplash.com/photo-1567427361324-1c2a59a6baad?w=400&h=300&fit=crop",
      rating: 4.7,
      reviewCount: 89,
      price: 149,
      isPopular: false,
      isNew: true,
      features: ["Análisis de contratos", "Base jurídica", "Recomendaciones", "Auditoría"],
      monthlyUsers: 340,
    },
    {
      id: "agent-data-analytics",
      name: "Análisis de Datos IA",
      description: "Agente para análisis avanzado y generación automática de reportes",
      category: "Análisis",
      image: "https://images.unsplash.com/photo-1551082407-5ddc1d3049c8?w=400&h=300&fit=crop",
      rating: 4.5,
      reviewCount: 123,
      price: 109,
      isPopular: false,
      isNew: false,
      features: ["Dashboards personalizados", "Predicciones", "Alertas automáticas", "Exportación"],
      monthlyUsers: 567,
    },
    {
      id: "agent-marketing-pro",
      name: "Marketing IA Avanzado",
      description: "Agente para estrategias y campañas de marketing con optimización automática",
      category: "Marketing",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
      rating: 4.4,
      reviewCount: 201,
      price: 119,
      isPopular: false,
      isNew: false,
      features: ["Campaign automation", "A/B testing", "Segmentación", "ROI tracking"],
      monthlyUsers: 678,
    },
  ];

  // Aplicar filtros si existen
  let filtered = agents;

  if (filters) {
    if (filters.category) {
      filtered = filtered.filter((a) =>
        a.category.toLowerCase().includes(filters.category!.toLowerCase())
      );
    }
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter((a) => a.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter((a) => a.price <= filters.maxPrice!);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.description.toLowerCase().includes(searchLower)
      );
    }
  }

  return filtered;
}

/**
 * Obtener detalles de un agente específico
 */
export async function getMarketplaceAgent(agentId: string): Promise<MarketplaceAgent | null> {
  const agents = await getMarketplaceAgents();
  return agents.find((a) => a.id === agentId) || null;
}

/**
 * Comprar un agente (mock - en producción sería un endpoint real)
 */
export async function purchaseAgent(agentId: string): Promise<{
  success: boolean;
  subscriptionId?: string;
  error?: string;
}> {
  try {
    // Simulación de compra - en producción:
    // 1. Validar permisos del usuario
    // 2. Procesar pago con Stripe/PayPal
    // 3. Crear subscription en DB
    // 4. Provisionar agente para el tenant

    // Por ahora solo simular éxito
    return {
      success: true,
      subscriptionId: `sub_${Date.now()}_${agentId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error purchasing agent",
    };
  }
}
