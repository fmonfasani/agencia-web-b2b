import { getTenantPrisma, prisma } from "./prisma";
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
    try {
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

        // 3. Last fallback: return global prisma
        return prisma;
    } catch (error) {
        return prisma;
    }
}

/**
 * Alias for getScopedPrisma to make it more intuitive in code
 */
export const db = getScopedPrisma;
