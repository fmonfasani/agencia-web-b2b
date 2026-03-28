"use server";

import { db } from "@/lib/scoped-prisma";
import { requireTenantMembership } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { DealStage } from "@prisma/client";

/**
 * Updates a deal's stage.
 */
export async function updateDealStageAction(dealId: string, newStage: DealStage) {
    const { user, tenantId } = await requireTenantMembership(["ADMIN", "SUPER_ADMIN"]);
    const userId = user?.id ?? user?.userId;
    if (!userId || !tenantId) {
        throw new Error("TENANT_CONTEXT_REQUIRED");
    }
    const scopedDb = await db({ userId, tenantId });

    try {
        const updated = await scopedDb.deal.update({
            where: { id: dealId },
            data: { stage: newStage },
        });

        revalidatePath("/[locale]/admin/deals", "page");
        revalidatePath("/[locale]/admin/dashboard", "page");

        return { success: true, deal: updated };
    } catch (error) {
        console.error("DB_ERROR: Failed to update deal stage", error);
        return { success: false, error: "Failed to update deal stage" };
    }
}
