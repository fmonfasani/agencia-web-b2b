import { apiFetch } from '@/lib/api/client'
"use server";

import { prisma } from "@/lib/prisma";
import { requireTenantMembership } from "@/lib/authz";
import { revalidatePath } from "next/cache";

/**
 * Updates the branding configuration for the current active tenant.
 * Only accessible by ADMIN and SUPER_ADMIN roles.
 */
export async function updateTenantBranding(branding: any) {
    const { tenantId } = await requireTenantMembership(["ADMIN", "SUPER_ADMIN"]);

    if (!tenantId) {
        throw new Error("No tenant ID found in session.");
    }

// [PHASE1.5] ⚠ Prisma detected → // [PHASE1.5] ⚠ Prisma detected →     await (prisma.tenant as any).update({
        where: { id: tenantId },
        data: {
            branding,
        },
    });

    // Revalidate the entire application layout to apply new CSS variables
    revalidatePath("/", "layout");

    return { success: true };
}

// [PHASE1.5] TODO: replace DB access with apiFetch()
