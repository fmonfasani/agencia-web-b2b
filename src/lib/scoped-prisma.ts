import { getTenantPrisma } from "./prisma";
import { logger } from "./logger";

export type ScopedPrismaContext = {
  userId?: string | null;
  tenantId?: string | null;
};

/**
 * Returns a Prisma client scoped to a tenant context.
 * Security-critical: fail closed when tenant context is missing.
 */
export async function getScopedPrisma(ctx?: ScopedPrismaContext) {
  if (!ctx?.userId || !ctx?.tenantId) {
    logger.warn("Scoped Prisma denied due to missing tenant context", {
      hasCtx: Boolean(ctx),
      hasUserId: Boolean(ctx?.userId),
      hasTenantId: Boolean(ctx?.tenantId),
    });
    throw new Error("TENANT_CONTEXT_REQUIRED");
  }

  return getTenantPrisma(ctx.tenantId);
}

/**
 * Alias for getScopedPrisma to make it more intuitive in code
 */
export const db = getScopedPrisma;
