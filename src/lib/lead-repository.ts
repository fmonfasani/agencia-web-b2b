import { getTenantPrisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type { Prisma } from "@prisma/client";

export interface CreateLeadInput {
  tenantId?: string;
  email: string | null;
  name?: string | null;
  companyName?: string | null;
  budget?: string | null;
  message?: string | null;
  source?: string;
  status?: string;
}

export function buildLeadTenantWhere(tenantId?: string): Prisma.LeadWhereInput {
  return { tenantId: requireTenantId(tenantId) };
}

export async function listLeadsByTenant(
  tenantId?: string,
  limit: number = 50,
  offset: number = 0,
) {
  const activeTenantId = requireTenantId(tenantId);
  const tPrisma = getTenantPrisma(activeTenantId);

  return tPrisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function countLeadsByTenant(tenantId?: string) {
  const activeTenantId = requireTenantId(tenantId);
  const tPrisma = getTenantPrisma(activeTenantId);
  return tPrisma.lead.count();
}

export async function createLeadForTenant(input: CreateLeadInput) {
  const activeTenantId = requireTenantId(input.tenantId);
  const tPrisma = getTenantPrisma(activeTenantId);
  return tPrisma.lead.create({
    data: {
      tenantId: activeTenantId,
      name: input.name,
      email: input.email,
      message: input.message,
      companyName: input.companyName ?? null,
      budget: input.budget ?? null,
      source: input.source || "manual",
      status: input.status ?? "NEW",
    },
  });
}
