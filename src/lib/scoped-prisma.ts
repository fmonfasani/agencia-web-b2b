import { getTenantPrisma } from "./prisma";
import { auth } from "./auth";
import { requireAuth as requireCustomAuth } from "./auth/request-auth";

/**
 * Returns a Prisma client scoped to the current active tenant.
 * It resolves the tenantId from:
 * 1. Request headers (x-tenant-id) - usually set by middleware
 * 2. Auth session (as a fallback)
 * 
 * USE THIS in Server Components and Server Actions to ensure tenant isolation.
 */
export async function getScopedPrisma() {
    // 1. Try NextAuth session
    const session = await auth();
    if (session?.user?.tenantId) {
        return getTenantPrisma(session.user.tenantId);
    }

    // 2. Try Custom Session
    const custom = await requireCustomAuth();
    if (custom?.session?.tenantId) {
        return getTenantPrisma(custom.session.tenantId);
    }

    // Never fail open to global prisma; this would break tenant isolation.
    throw new Error("UNAUTHORIZED_SCOPED_PRISMA_CONTEXT");
}

/**
 * Alias for getScopedPrisma to make it more intuitive in code
 */
export const db = getScopedPrisma;
