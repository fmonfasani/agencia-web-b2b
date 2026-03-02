import { getTenantPrisma } from "@/lib/prisma";
import { DealStage } from "@prisma/client";

/**
 * Service to handle Lead transformation into commercial opportunities (Deals).
 */
export const LeadConversionService = {
    /**
     * Converts a Lead into a Deal.
     * If a Deal already exists for this lead, it returns the existing one or updates it.
     */
    async convertToDeal(tenantId: string, leadId: string, userId?: string) {
        const tPrisma = getTenantPrisma(tenantId);

        // 1. Fetch Lead data
        const lead = await tPrisma.lead.findUnique({
            where: { id: leadId },
        });

        if (!lead) throw new Error("Lead not found");

        // 2. Check if deal already exists for this lead to avoid duplicates
        const existingDeal = await tPrisma.deal.findFirst({
            where: { leadId },
        });

        if (existingDeal) {
            return existingDeal;
        }

        // 3. Create a new Deal
        // We Map lead's potentialScore to a deal value if not provided (placeholder logic)
        const estimatedValue = lead.potentialScore ? lead.potentialScore * 10 : 1000;

        const deal = await tPrisma.deal.create({
            data: {
                tenantId,
                leadId,
                assignedToUserId: userId || null,
                stage: "PROSPECTING",
                value: estimatedValue,
                currency: "USD", // Default
                notes: `Converted from lead: ${lead.name || lead.companyName}. Original source: ${lead.sourceType}`,
            },
        });

        // 4. Update Lead status to CONVERTED
        await tPrisma.lead.update({
            where: { id: leadId },
            data: { status: "CONVERTED" },
        });

        // 5. Emit Business Event
        await tPrisma.businessEvent.create({
            data: {
                tenantId,
                type: "LEAD_CONVERTED_TO_DEAL",
                payload: {
                    leadId,
                    dealId: deal.id,
                    value: estimatedValue,
                },
                source: "system",
            },
        });

        return deal;
    },
};
