/**
 * GET /api/leads/intelligence/pending
 * Devuelve leads que aún NO tienen LeadIntelligence para que el agent-service los analice.
 * Autenticado con X-Internal-Secret.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInternalSecret } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  if (!validateInternalSecret(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const tenantId = searchParams.get("tenantId");

  const where: Record<string, unknown> = {
    intelligence: null, // sin LeadIntelligence todavía
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
