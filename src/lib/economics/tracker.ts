import { prisma } from "@/lib/prisma";

export interface ExpenseRecord {
    tenantId: string;
    category: "AI_TOKENS" | "SCRAPER_LEAD" | "INFRASTRUCTURE";
    amount: number; // Costo en USD o ARS
    description: string;
}

/**
 * Service to track and analyze the financial efficiency of a tenant.
 * Key for proving the business model (Unit Economics).
 */
export class EconomicsService {
    // Costos fijos estimados
    private static readonly COST_PER_SCRAPED_LEAD = 0.05; // USD
    private static readonly COST_PER_1K_TOKENS = 0.01;   // USD (GPT-4o mini avg)

    /**
     * Calculates the current ROI for a tenant.
     * ROI = (Revenue - OpEx) / OpEx
     */
    static async getTenantROI(tenantId: string) {
        // 1. Calcular Ingresos (Revenue)
        const revenue = await prisma.deal.aggregate({
            where: {
                tenantId,
                stage: "CLOSED_WON",
            },
            _sum: { value: true },
        });

        const totalRevenue = Number(revenue._sum.value || 0);

        // 2. Calcular Gastos (OpEx)
        // Buscamos eventos de tipo COST_RECORD o inferimos de BusinessEvents
        const scraperEvents = await prisma.businessEvent.count({
            where: {
                tenantId,
                type: "LEAD_CAPTURED",
                source: "scraper",
            },
        });

        const aiEvents = await prisma.businessEvent.count({
            where: {
                tenantId,
                type: "AGENT_MESSAGE_SENT",
            },
        });

        const scraperCost = scraperEvents * this.COST_PER_SCRAPED_LEAD;
        const aiCost = (aiEvents * 500 / 1000) * this.COST_PER_1K_TOKENS; // Asumiendo 500 tokens avg por msg

        const totalOpEx = scraperCost + aiCost + 10; // +10 USD de fee base infra

        // 3. Resultados
        return {
            totalRevenue,
            totalOpEx,
            netProfit: totalRevenue - totalOpEx,
            roi: totalOpEx > 0 ? (totalRevenue - totalOpEx) / totalOpEx : 0,
            efficiencyScore: totalOpEx > 0 ? totalRevenue / totalOpEx : 0,
            breakEven: totalRevenue >= totalOpEx
        };
    }

    /**
     * Logs a specific operational expense.
     */
    static async logExpense(record: ExpenseRecord) {
        await prisma.businessEvent.create({
            data: {
                tenantId: record.tenantId,
                type: "OPERATIONAL_EXPENSE",
                payload: {
                    category: record.category,
                    amount: record.amount,
                    description: record.description
                },
                source: "system",
            },
        });
    }
}
