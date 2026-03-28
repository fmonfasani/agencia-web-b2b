import { getTenantPrisma } from "@/lib/prisma";
import { generateAIResponse } from "@/lib/bot/ai-manager";

/**
 * Service to automate lead nurturing and detect stalled opportunities.
 */
export const LeadAutomationService = {
    /**
     * Analyzes leads that haven't been updated in more than 7 days.
     * Proposes follow-up strategies using LLM logic.
     */
    async analyzeStalledLeads(tenantId: string) {
        const tPrisma = getTenantPrisma(tenantId);

        // 1. Get leads that are stuck (e.g., status is not CONVERTED/LOST and updatedAt < 7 days ago)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const stalledLeads = await tPrisma.lead.findMany({
            where: {
                status: { in: ["NEW", "CONTACTED", "QUALIFIED"] },
                updatedAt: { lt: sevenDaysAgo },
            },
            take: 10, // Limit for analysis session
        });

        if (stalledLeads.length === 0) {
            return { message: "No stalled leads found. Pipeline is healthy!" };
        }

        // 2. Prepare report for AI analysis
        const leadsReport = stalledLeads.map((l: { id: string; name?: string | null; companyName?: string | null; status: string; potentialScore?: number | null; updatedAt: Date }) => ({
            id: l.id,
            name: l.name || l.companyName,
            status: l.status,
            score: l.potentialScore,
            lastUpdated: l.updatedAt,
        }));

        const analysisPrompt = `
      Eres un experto en Growth para una Webshooks. Tengo los siguientes leads estancados (sin actividad por más de 7 días):
      ${JSON.stringify(leadsReport, null, 2)}
      
      Por favor:
      1. Identifica los 3 prospectos con mayor prioridad (basándote en Digital Score).
      2. Propón una frase de apertura personalizada para reactivarlos por WhatsApp.
      3. Sugiere una acción concreta para el equipo comercial.
    `;

        // 3. Get AI Insights
        // This is using generateAIResponse which takes history + userMessage. 
        // We send the prompt as userMessage and empty history for clean analysis.
        const insights = await generateAIResponse([], analysisPrompt);

        // 4. Record the automation event
        await tPrisma.businessEvent.create({
            data: {
                tenantId,
                type: "LEAD_AUTOMATION_INSIGHTS",
                payload: {
                    analyzedCount: stalledLeads.length,
                    insightsSummary: insights.substring(0, 500) // Truncated for history
                },
                source: "agent",
            },
        });

        return {
            count: stalledLeads.length,
            insights,
            leads: stalledLeads
        };
    },
};
