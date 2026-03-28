type BusinessType = "SERVICIO" | "INDUSTRIA" | "COMERCIO" | "OFICIO";

/**
 * Lead classification logic to determine BusinessType.
 */

const CATEGORY_MAP: Record<string, BusinessType> = {
  // SERVICIOS
  "Agencia de marketing": "SERVICIO",
  Consultoría: "SERVICIO",
  Software: "SERVICIO",
  Abogado: "SERVICIO",
  Contador: "SERVICIO",
  Seguros: "SERVICIO",

  // INDUSTRIA
  Fábrica: "INDUSTRIA",
  Manufactura: "INDUSTRIA",
  Metalúrgica: "INDUSTRIA",
  Textil: "INDUSTRIA",

  // COMERCIO
  Tienda: "COMERCIO",
  Restaurante: "COMERCIO",
  Supermercado: "COMERCIO",
  Minorista: "COMERCIO",
  Mayorista: "COMERCIO",

  // OFICIO
  Plomería: "OFICIO",
  Electricista: "OFICIO",
  Construcción: "OFICIO",
  Carpintería: "OFICIO",
  "Taller mecánico": "OFICIO",
};

export function classifyBusinessByCategory(
  category: string | null | undefined,
): BusinessType | null {
  if (!category) return null;

  const normalizedCategory = category.trim();

  // Direct match
  if (CATEGORY_MAP[normalizedCategory]) {
    return CATEGORY_MAP[normalizedCategory];
  }

  // Keyword match
  const catLower = normalizedCategory.toLowerCase();

  if (
    catLower.includes("fábrica") ||
    catLower.includes("indus") ||
    catLower.includes("manufactu")
  ) {
    return "INDUSTRIA";
  }

  if (
    catLower.includes("tienda") ||
    catLower.includes("venta") ||
    catLower.includes("comercio")
  ) {
    return "COMERCIO";
  }

  if (
    catLower.includes("servi") ||
    catLower.includes("agencia") ||
    catLower.includes("consult")
  ) {
    return "SERVICIO";
  }

  if (
    catLower.includes("taller") ||
    catLower.includes("mantenimien") ||
    catLower.includes("instalaci")
  ) {
    return "OFICIO";
  }

  return null;
}
