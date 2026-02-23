import { BusinessType } from "@prisma/client";

/**
 * Lead classification logic to determine BusinessType.
 */

const CATEGORY_MAP: Record<string, BusinessType> = {
  // SERVICIOS
  "Agencia de marketing": BusinessType.SERVICIO,
  Consultoría: BusinessType.SERVICIO,
  Software: BusinessType.SERVICIO,
  Abogado: BusinessType.SERVICIO,
  Contador: BusinessType.SERVICIO,
  Seguros: BusinessType.SERVICIO,

  // INDUSTRIA
  Fábrica: BusinessType.INDUSTRIA,
  Manufactura: BusinessType.INDUSTRIA,
  Metalúrgica: BusinessType.INDUSTRIA,
  Textil: BusinessType.INDUSTRIA,

  // COMERCIO
  Tienda: BusinessType.COMERCIO,
  Restaurante: BusinessType.COMERCIO,
  Supermercado: BusinessType.COMERCIO,
  Minorista: BusinessType.COMERCIO,
  Mayorista: BusinessType.COMERCIO,

  // OFICIO
  Plomería: BusinessType.OFICIO,
  Electricista: BusinessType.OFICIO,
  Construcción: BusinessType.OFICIO,
  Carpintería: BusinessType.OFICIO,
  "Taller mecánico": BusinessType.OFICIO,
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
    return BusinessType.INDUSTRIA;
  }

  if (
    catLower.includes("tienda") ||
    catLower.includes("venta") ||
    catLower.includes("comercio")
  ) {
    return BusinessType.COMERCIO;
  }

  if (
    catLower.includes("servi") ||
    catLower.includes("agencia") ||
    catLower.includes("consult")
  ) {
    return BusinessType.SERVICIO;
  }

  if (
    catLower.includes("taller") ||
    catLower.includes("mantenimien") ||
    catLower.includes("instalaci")
  ) {
    return BusinessType.OFICIO;
  }

  return null;
}
