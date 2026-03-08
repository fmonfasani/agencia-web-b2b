import { prisma } from "@/lib/prisma";
import { aiEngine } from "@/lib/ai/engine";
import { IntelligenceResult } from "@/types/leads";

const PROBLEM_SERVICES_MAP: Record<string, string> = {
    "No tiene WhatsApp": "Automatización de WhatsApp & CRM",
    "Velocidad lenta": "Optimización Performance",
    "Sin certificado SSL": "Seguridad & Confianza Digital",
    "SEO pobre": "SEO Avanzado & Captación Orgánica",
    "No tiene formulario": "Optimización de Conversión (CRO)",
    "Baja tasa de reviews": "Gestión de Reputación Online",
    "Diseño anticuado": "Rediseño Web UX/UI",
    "Missing social media": "Estrategia de Contenidos & RRSS"
};

export class IntelligenceService {
    static async getLeadIntelligence(leadId: string, force: boolean = false): Promise<IntelligenceResult> {
        if (!force) {
            const existing = await prisma.leadIntelligence.findUnique({
                where: { leadId }
            });

            if (existing && existing.analyzedAt &&
                (Date.now() - new Date(existing.analyzedAt).getTime() < 1000 * 60 * 60 * 24 * 7)) {
                return existing as any as IntelligenceResult;
            }
        }

        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!lead) throw new Error("Lead not found");

        const context = {
            name: lead.name,
            category: lead.category,
            website: lead.website,
            address: lead.address,
            description: lead.description,
            rating: lead.rating,
            reviewsCount: lead.reviewsCount,
            metadata: lead.rawMetadata
        };

        const result = await aiEngine.generate({
            prompt: `Realiza un análisis profundo de este Lead de negocio. 
            Lead: ${JSON.stringify(context)}
            
            Usa el Pensamiento de Cadena (CoT) para:
            1. Evaluar el Gap Digital (qué le falta vs competencia).
            2. Evaluar la Demanda del Mercado en su zona.
            3. Proyectar un Revenue Estimado de servicios b2b que podemos venderle.
            4. Generar una Estrategia de Cierre (Brief y Preguntas de entrevista).
            5. Redactar mensajes CORE para WhatsApp y Email.`,
            schema: {
                type: "object",
                properties: {
                    tier: { enum: ["HOT", "WARM", "COOL", "COLD"] },
                    opportunityScore: { type: "number" },
                    demandScore: { type: "number" },
                    digitalGapScore: { type: "number" },
                    outreachScore: { type: "number" },
                    topProblem: { type: "string" },
                    revenueEstimate: { type: "number" },
                    bestChannel: { type: "string" },
                    whatsappMsg: { type: "string" },
                    emailSubject: { type: "string" },
                    emailBody: { type: "string" },
                    strategicBrief: { type: "string" },
                    marketAnalysis: { type: "string" },
                    nicheAnalysis: { type: "string" },
                    interviewGuide: { type: "string" },
                    detectedProblems: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                problem: { type: "string" },
                                pain: { type: "string" },
                                service: { type: "string" }
                            }
                        }
                    }
                },
                required: ["tier", "opportunityScore", "strategicBrief", "whatsappMsg", "emailBody"]
            }
        });

        // Save result
        return await prisma.leadIntelligence.upsert({
            where: { leadId },
            create: {
                leadId,
                analyzedAt: new Date(),
                ...result
            },
            update: {
                analyzedAt: new Date(),
                ...result
            }
        }) as any as IntelligenceResult;
    }
}
