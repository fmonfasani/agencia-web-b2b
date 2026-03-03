import { getActiveTenantId } from "./tenant-context";
import { getTenantPrisma, prisma } from "./prisma";
import { auth } from "./auth";

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
        // 1. Try to get it from headers (standard way in our middleware)
        const tenantId = await getActiveTenantId();
        return getTenantPrisma(tenantId);
    } catch (error) {
        // 2. Fallback to auth session if headers are not available 
        // (e.g. during some direct server-side calls)
        const session = await auth();
        const sessionTenantId = session?.user?.tenantId;

        if (sessionTenantId) {
            return getTenantPrisma(sessionTenantId);
        }

        // 3. Last fallback: return global prisma (use with caution!)
        // For SUPER_ADMIN or public parts of the app
        return prisma;
    }
}

/**
 * Alias for getScopedPrisma to make it more intuitive in code
 */
export const db = getScopedPrisma;
