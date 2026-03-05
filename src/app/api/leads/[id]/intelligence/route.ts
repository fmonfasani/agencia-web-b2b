/**
 * GET  /api/leads/[id]/intelligence  → devuelve LeadIntelligence de un lead
 * POST /api/leads/[id]/intelligence  → guarda/actualiza LeadIntelligence (llamado por agent-service)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

function isAuthorized(req: NextRequest): boolean {
    const s = req.headers.get("x-internal-secret") ?? req.headers.get("x-admin-secret") ?? "";
    return s !== "" && s === INTERNAL_SECRET;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const intel = await prisma.leadIntelligence.findUnique({ where: { leadId: id } });
    if (!intel) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(intel);
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Verificar que el lead existe
    const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    let body: Record<string, any>;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const intel = await prisma.leadIntelligence.upsert({
        where: { leadId: id },
        create: {
            leadId: id,
            tier: body.tier ?? "COLD",
            opportunityScore: body.opportunityScore ?? 0,
            demandScore: body.demandScore ?? 0,
            digitalGapScore: body.digitalGapScore ?? 0,
            outreachScore: body.outreachScore ?? 0,
            websiteLoads: body.websiteLoads ?? null,
            hasSSL: body.hasSSL ?? null,
            hasContactForm: body.hasContactForm ?? null,
            hasBookingSystem: body.hasBookingSystem ?? null,
            hasChatbot: body.hasChatbot ?? null,
            hasWhatsappLink: body.hasWhatsappLink ?? null,
            responseTimeMs: body.responseTimeMs ?? null,
            detectedProblems: body.detectedProblems ?? [],
            topProblem: body.topProblem ?? null,
            revenueEstimate: body.revenueEstimate ?? null,
            bestChannel: body.bestChannel ?? null,
            channelScores: body.channelScores ?? {},
            whatsappMsg: body.whatsappMsg ?? null,
            emailSubject: body.emailSubject ?? null,
            emailBody: body.emailBody ?? null,
            modelVersion: body.modelVersion ?? "1.0",
        },
        update: {
            tier: body.tier ?? "COLD",
            opportunityScore: body.opportunityScore ?? 0,
            demandScore: body.demandScore ?? 0,
            digitalGapScore: body.digitalGapScore ?? 0,
            outreachScore: body.outreachScore ?? 0,
            websiteLoads: body.websiteLoads,
            hasSSL: body.hasSSL,
            hasContactForm: body.hasContactForm,
            hasBookingSystem: body.hasBookingSystem,
            hasChatbot: body.hasChatbot,
            hasWhatsappLink: body.hasWhatsappLink,
            responseTimeMs: body.responseTimeMs,
            detectedProblems: body.detectedProblems ?? [],
            topProblem: body.topProblem,
            revenueEstimate: body.revenueEstimate,
            bestChannel: body.bestChannel,
            channelScores: body.channelScores ?? {},
            whatsappMsg: body.whatsappMsg,
            emailSubject: body.emailSubject,
            emailBody: body.emailBody,
            analyzedAt: new Date(),
        },
    });

    return NextResponse.json({ status: "ok", id: intel.id, tier: intel.tier }, { status: 200 });
}
