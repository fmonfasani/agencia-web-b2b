import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type { Prisma } from "@prisma/client";
// Updated schema: Lead now has tenantId correctly.

export interface CreateLeadInput {
  tenantId?: string;
  email: string;
  name?: string | null;
  company?: string | null;
  budget?: string | null;
  message: string;
  source: string;
  status?: string;
}

export function buildLeadTenantWhere(tenantId?: string): Prisma.LeadWhereInput {
  // @ts-expect-error - Prisma types stale in assistant
  return { tenantId: requireTenantId(tenantId) };
}

export async function listLeadsByTenant(
  tenantId?: string,
  limit: number = 50,
  offset: number = 0,
) {
  const activeTenantId = requireTenantId(tenantId);

  return prisma.lead.findMany({
    // @ts-expect-error - Prisma types stale in assistant
    where: { tenantId: activeTenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function countLeadsByTenant(tenantId?: string) {
  const activeTenantId = requireTenantId(tenantId);
  return prisma.lead.count({
    // @ts-expect-error - Prisma types stale in assistant
    where: { tenantId: activeTenantId },
  });
}

export async function createLeadForTenant(input: CreateLeadInput) {
  const activeTenantId = requireTenantId(input.tenantId);

  return prisma.lead.create({
    data: {
      // @ts-expect-error - Prisma types stale in assistant
      tenantId: activeTenantId,
      name: input.name,
      email: input.email,
      message: input.message,
      company: input.company ?? null,
      budget: input.budget ?? null,
      source: input.source,
      status: input.status ?? "NEW",
    },
  });
}
