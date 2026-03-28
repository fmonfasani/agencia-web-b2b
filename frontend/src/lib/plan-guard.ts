import { prisma } from "@/lib/prisma";

export class PlanLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PlanLimitError";
    }
}

type LimitKey = "maxUsers" | "maxAgents" | "maxChannels" | "maxProducts";

/**
 * Asserts that a tenant hasn't exceeded a plan limit.
 * Throws PlanLimitError (HTTP 403) if the limit is reached.
 * -1 = unlimited
 */
export async function assertPlanLimit(
    tenantId: string,
    limitKey: LimitKey,
    currentCount: number,
): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
        where: { tenantId },
        include: { plan: true },
    });

    if (!subscription || !subscription.plan) {
        // No subscription found — deny by default
        throw new PlanLimitError(
            "No active subscription found for this organization.",
        );
    }

    const limits = subscription.plan.limits as Record<string, number>;
    const limit = limits[limitKey] ?? 1;

    if (limit === -1) return; // Unlimited

    if (currentCount >= limit) {
        throw new PlanLimitError(
            `Tu plan "${subscription.plan.name}" tiene un límite de ${limit} ${limitKey.replace("max", "").toLowerCase()}. Actualizá tu plan para continuar.`,
        );
    }
}

/**
 * Quick plan limits fetch for display in UI
 */
export async function getPlanLimits(
    tenantId: string,
): Promise<Record<string, number> | null> {
    const subscription = await prisma.subscription.findUnique({
        where: { tenantId },
        include: { plan: true },
    });

    if (!subscription?.plan) return null;

    return subscription.plan.limits as Record<string, number>;
}
