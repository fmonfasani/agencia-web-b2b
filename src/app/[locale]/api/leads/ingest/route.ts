import { NextRequest, NextResponse } from "next/server";
import { AuthorizationError, requireRoleForRequest } from "@/lib/authz";
import { resolveTenantIdFromHeaders } from "@/lib/tenant-context";
import { ingestLead, LeadIngestInput } from "@/lib/leads/ingest.service";

/**
 * POST /api/leads/ingest
 * Gatekeeper for all lead entries (Scraper, Manual, API, Ads).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authorization & Tenant Scoping
    requireRoleForRequest(request, ["OWNER", "ADMIN", "SALES"]);

    const activeTenantId = resolveTenantIdFromHeaders(
      request.headers,
      process.env.DEFAULT_TENANT_ID,
    );

    // 2. Body Parsing
    const body = await request.json();

    // We expect the body to match LeadIngestInput mostly
    const ingestInput: LeadIngestInput = {
      tenantId: activeTenantId,
      sourceType: body.sourceType || "MANUAL",
      businessType: body.businessType,

      name: body.name,
      email: body.email,
      phone: body.phone,
      website: body.website,
      instagram: body.instagram,
      whatsapp: body.whatsapp,

      googlePlaceId: body.googlePlaceId,
      googleMapsUrl: body.googleMapsUrl,
      category: body.category,
      rating: body.rating,
      reviewsCount: body.reviewsCount,
      address: body.address,
      description: body.description,

      rawMetadata: body.rawMetadata || body, // Save the whole body if no metadata provided
    };

    // 3. Process & Persist
    const lead = await ingestLead(ingestInput);

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      score: lead.potentialScore,
      priority: lead.priority,
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

    if (error.message === "Business type is required for manual leads.") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error while ingesting lead." },
      { status: 500 },
    );
  }
}
