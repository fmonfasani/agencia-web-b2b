/**
 * GET /api/leads/intelligence/pending
 * Devuelve leads que aún NO tienen LeadIntelligence para que el agent-service los analice.
 * Autenticado con X-Internal-Secret.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

function isAuthorized(req: NextRequest): boolean {
    const s = req.headers.get("x-internal-secret") ?? req.headers.get("x-admin-secret") ?? "";
    return s !== "" && s === INTERNAL_SECRET;
}

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const tenantId = searchParams.get("tenantId");

    const where: Record<string, any> = {
        intelligence: null,  // sin LeadIntelligence todavía
        website: { not: null }, // solo los que tienen website (para analysas)
    };
    if (tenantId) where.tenantId = tenantId;

    const leads = await prisma.lead.findMany({
        where,
        take: limit,
        select: {
            id: true,
            name: true,
            website: true,
            phone: true,
            whatsapp: true,
            instagram: true,
            facebook: true,
            linkedin: true,
            rating: true,
            reviewsCount: true,
            category: true,
            description: true,
            address: true,
            tenantId: true,
        },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
        count: leads.length,
        leads,
    });
}
