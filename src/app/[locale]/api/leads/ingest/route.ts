import { NextRequest, NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/authz";
import { resolveTenantIdFromHeaders } from "@/lib/tenant-context";
import { ingestLead, LeadIngestInput } from "@/lib/leads/ingest.service";
import { requireAuth } from "@/lib/auth/request-auth";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";

const leadSchema = z.object({
  sourceType: z.enum(["SCRAPER", "MANUAL", "API", "ADS"]).default("MANUAL"),
  businessType: z.string().optional(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
  tiktok: z.string().optional(),
  whatsapp: z.string().optional(),
  googlePlaceId: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  category: z.string().optional(),
  rating: z.number().optional(),
  reviewsCount: z.number().int().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  rawMetadata: z.any().optional(),
});

/**
 * POST /api/leads/ingest
 * Gatekeeper for all lead entries (Scraper, Manual, API, Ads).
 */
export async function POST(request: NextRequest) {
  try {
    // 0. Rate Limiting
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const { success: limitOk } = await ratelimit.limit(`leads:ingest:${ip}`);
    if (!limitOk) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 1. Session & Role Validation
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const activeTenantId = resolveTenantIdFromHeaders(
      request.headers,
      auth.session.tenantId || process.env.DEFAULT_TENANT_ID,
    );

    const tPrisma = getTenantPrisma(activeTenantId);

    // Check membership role for this tenant
    const membership = await tPrisma.membership.findFirst({
      where: {
        userId: auth.user.id,
        status: "ACTIVE",
      },
    });

    if (!membership || !["ADMIN", "SUPER_ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Permisos insuficientes" },
        { status: 403 },
      );
    }

    // 2. Body Parsing & Validation
    const body = await request.json();
    const result = leadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;

    const ingestInput: LeadIngestInput = {
      tenantId: activeTenantId,
      sourceType: data.sourceType as any,
      businessType: data.businessType as any,

      name: data.name,
      email: data.email || undefined,
      phone: data.phone,
      website: data.website || undefined,
      instagram: data.instagram,
      facebook: data.facebook,
      linkedin: data.linkedin,
      tiktok: data.tiktok,
      whatsapp: data.whatsapp,

      googlePlaceId: data.googlePlaceId,
      googleMapsUrl: data.googleMapsUrl,
      category: data.category,
      rating: data.rating,
      reviewsCount: data.reviewsCount,
      address: data.address,
      description: data.description,

      rawMetadata: data.rawMetadata || body,
    };

    // 3. Process & Persist
    const lead = await ingestLead(ingestInput);

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      score: (lead as any).potentialScore,
      priority: (lead as any).priority,
      message: "Lead processed and persisted successfully.",
    });
  } catch (error: any) {
    console.error("[Leads Ingest API Error]:", error);

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Internal server error while ingesting lead." },
      { status: 500 },
    );
  }
}
