import { prisma } from "@/lib/prisma";
import { aiEngine } from "@/lib/ai/engine";
import { IntelligenceResult } from "@/types/leads";
import { BridgeClient } from "@/lib/bridge-client";

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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function parseJsonObject(raw: string): Record<string, unknown> {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart) {
        throw new Error("AI response did not contain a valid JSON object.");
    }

    const parsed: unknown = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    if (!isRecord(parsed)) {
        throw new Error("AI response JSON was not an object.");
    }

    return parsed;
}

export class LeadIntelligenceService {
    static async analyzeLead(leadId: string): Promise<IntelligenceResult> {
        return this.getLeadIntelligence(leadId, true);
    }

    static async getLeadIntelligence(leadId: string, force: boolean = false): Promise<IntelligenceResult> {
        if (!force) {
            const existing = await BridgeClient.query('leadIntelligence', 'findUnique', {
                where: { leadId }
            });

            if (existing && existing.analyzedAt &&
                (Date.now() - new Date(existing.analyzedAt).getTime() < 1000 * 60 * 60 * 24 * 7)) {
                return existing as any as IntelligenceResult;
            }
        }

        const lead = await BridgeClient.query('lead', 'findUnique', {
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

        const prompt = `Realiza un análisis profundo de este Lead de negocio. 
            Lead: ${JSON.stringify(context)}
            
            Usa el Pensamiento de Cadena (CoT) para:
            1. Evaluar el Gap Digital (qué le falta vs competencia).
            2. Evaluar la Demanda del Mercado en su zona.
            3. Proyectar un Revenue Estimado de servicios b2b que podemos venderle.
            4. Generar una Estrategia de Cierre (Brief y Preguntas de entrevista).
            5. Redactar mensajes CORE para WhatsApp y Email.
            
            OUTPUT ONLY VALID JSON according to the schema below:
            {
                tier: "HOT" | "WARM" | "COOL" | "COLD",
                opportunityScore: number,
                demandScore: number,
                digitalGapScore: number,
                outreachScore: number,
                topProblem: string,
                revenueEstimate: number,
                bestChannel: string,
                whatsappMsg: string,
                emailSubject: string,
                emailBody: string,
                strategicBrief: string,
                marketAnalysis: string,
                nicheAnalysis: string,
                interviewGuide: string,
                detectedProblems: [{ problem: string, pain: string, service: string }]
            }`;

        const aiResponse = await aiEngine.generateWithFallback([
            { role: "system", content: "You are a professional B2B Sales Engineer analyzing leads. Output ONLY JSON." },
            { role: "user", content: prompt }
        ]);

        const result = parseJsonObject(aiResponse) as any;

        // Proxy via Bridge
        return await BridgeClient.query('leadIntelligence', 'upsert', {
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
        });
    }
}
