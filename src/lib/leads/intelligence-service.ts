import { prisma } from "@/lib/prisma";
import { aiEngine } from "@/lib/ai/engine";

export interface IntelligenceResult {
    tier: "HOT" | "WARM" | "COOL" | "COLD";
    opportunityScore: number;
    demandScore: number;
    digitalGapScore: number;
    outreachScore: number;
    websiteLoads?: boolean;
    hasSSL?: boolean;
    hasContactForm?: boolean;
    hasBookingSystem?: boolean;
    hasChatbot?: boolean;
    hasWhatsappLink?: boolean;
    topProblem?: string;
    revenueEstimate?: number;
    bestChannel?: string;
    channelScores?: Record<string, number>;
    whatsappMsg?: string;
    emailSubject?: string;
    emailBody?: string;
}

export class LeadIntelligenceService {
    /**
     * Performs AI-driven analysis on a specific lead.
     */
    static async analyzeLead(leadId: string): Promise<IntelligenceResult> {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { intelligence: true },
        });

        if (!lead) {
            throw new Error(`Lead with ID ${leadId} not found.`);
        }

        // Preparation for AI Prompt
        const leadData = {
            name: lead.name,
            company: lead.companyName,
            category: lead.category,
            rating: lead.rating,
            reviews: lead.reviewsCount,
            website: lead.website,
            address: lead.address,
        };

        const prompt = `
      Act as an expert B2B Sales Intel Agent. Analyze the following lead and provide structured intelligence.
      Lead Data: ${JSON.stringify(leadData)}

      Instructions:
      1. Evaluate "Digital Gaps": Check if based on the data provided, they likely lack a chatbot, booking system, or have a poor web presence.
      2. Score from 0-100:
         - opportunityScore: Overall potential for our B2B services.
         - demandScore: Based on ratings and popularity.
         - digitalGapScore: Higher if they have more visible technical needs.
      3. Classify Tier: HOT (high need, high value), WARM, COOL, or COLD.
      4. Identify "topProblem": The single most urgent thing we can fix for them.
      5. Revenue Estimate: Estimated monthly revenue we could generate for them in USD.
      6. Craft Outreach:
         - whatsappMsg: A short, non-pushy, personalized message focusing on the topProblem.
         - emailSubject/emailBody: A more formal/professional reaching out.

      Response MUST be a valid JSON object matching this schema:
      {
        "tier": "HOT" | "WARM" | "COOL" | "COLD",
        "opportunityScore": number,
        "demandScore": number,
        "digitalGapScore": number,
        "outreachScore": number,
        "websiteLoads": boolean,
        "hasSSL": boolean,
        "topProblem": string,
        "revenueEstimate": number,
        "bestChannel": "whatsapp" | "email" | "instagram",
        "whatsappMsg": string,
        "emailSubject": string,
        "emailBody": string
      }
    `;

        const aiResponse = await aiEngine.generateWithFallback([
            { role: "system", content: "You are a specialized lead enrichment assistant. You only output valid JSON." },
            { role: "user", content: prompt }
        ], lead.tenantId ?? undefined);

        let parsedResult: IntelligenceResult;
        try {
            // Basic sanitization in case of extra markdown text
            const jsonStart = aiResponse.indexOf('{');
            const jsonEnd = aiResponse.lastIndexOf('}') + 1;
            parsedResult = JSON.parse(aiResponse.slice(jsonStart, jsonEnd));
        } catch (e) {
            console.error("[Intelligence Service] AI Response was not valid JSON:", aiResponse);
            throw new Error("Failed to parse AI intelligence result.");
        }

        // Persist to Database
        await prisma.leadIntelligence.upsert({
            where: { leadId },
            update: {
                ...parsedResult,
                analyzedAt: new Date(),
                updatedAt: new Date(),
            },
            create: {
                leadId,
                ...parsedResult,
                analyzedAt: new Date(),
            },
        });

        // Update Lead status if high potential
        if (parsedResult.opportunityScore > 75) {
            await prisma.lead.update({
                where: { id: leadId },
                data: {
                    status: "QUALIFIED",
                    priority: "HIGH"
                },
            });
        }

        return parsedResult;
    }
}
