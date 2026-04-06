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

// ── Reviews ───────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  authorName: string;
  authorInitials: string;
  rating: number;
  comment: string;
  date: string;
  isOwn?: boolean;
}

const mockReviews: Record<string, Review[]> = {
  "agent-recepcion-pro": [
    { id: "r1", authorName: "Carlos Méndez", authorInitials: "CM", rating: 5, comment: "Excelente agente, redujo el tiempo de respuesta a clientes en un 60%. Muy recomendado.", date: "2026-03-15" },
    { id: "r2", authorName: "María García", authorInitials: "MG", rating: 5, comment: "La integración con nuestro CRM fue perfecta. El soporte técnico es muy rápido.", date: "2026-03-10" },
    { id: "r3", authorName: "Juan Pérez", authorInitials: "JP", rating: 4, comment: "Muy buen agente. Tarda un poco en responder en horas pico pero en general es excelente.", date: "2026-02-28" },
    { id: "r4", authorName: "Laura Torres", authorInitials: "LT", rating: 5, comment: "Superó todas nuestras expectativas. La IA entiende perfectamente el contexto.", date: "2026-02-20" },
    { id: "r5", authorName: "Roberto Silva", authorInitials: "RS", rating: 4, comment: "Buena relación calidad-precio. Lo recomiendo para empresas medianas.", date: "2026-02-10" },
  ],
  "agent-ventas-enterprise": [
    { id: "r6", authorName: "Ana Martínez", authorInitials: "AM", rating: 5, comment: "El forecast de IA es increíblemente preciso. Triplicamos nuestras conversiones.", date: "2026-03-20" },
    { id: "r7", authorName: "Diego López", authorInitials: "DL", rating: 5, comment: "Mejor inversión del año. El pipeline management es muy intuitivo.", date: "2026-03-05" },
    { id: "r8", authorName: "Sofía Ruiz", authorInitials: "SR", rating: 4, comment: "Muy completo. La curva de aprendizaje es alta pero vale la pena.", date: "2026-02-25" },
  ],
};

export async function getAgentReviews(
  agentId: string,
  page: number = 1,
  ratingFilter: number = 0
): Promise<{ reviews: Review[]; total: number; totalPages: number }> {
  const PER_PAGE = 5;
  let reviews = mockReviews[agentId] ?? mockReviews["agent-recepcion-pro"] ?? [];
  if (ratingFilter > 0) reviews = reviews.filter((r) => r.rating >= ratingFilter);
  const total = reviews.length;
  const paginated = reviews.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return { reviews: paginated, total, totalPages: Math.ceil(total / PER_PAGE) };
}

export async function submitReview(
  agentId: string,
  rating: number,
  comment: string
): Promise<{ success: boolean; error?: string }> {
  if (!comment.trim() || rating < 1 || rating > 5) {
    return { success: false, error: "Rating y comentario son requeridos" };
  }
  return { success: true };
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
