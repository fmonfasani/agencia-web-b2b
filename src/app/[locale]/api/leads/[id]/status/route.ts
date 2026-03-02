import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { AuthorizationError, requireRole } from "@/lib/authz";
import { getSessionUser } from "@/lib/auth";
import { LeadConversionService } from "@/lib/leads/conversion-service";

const ALLOWED_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check
    await requireRole(["OWNER", "ADMIN", "SALES"]);

    const body = await request.json();
    const status = String(body?.status || "").toUpperCase();

    if (
      !ALLOWED_LEAD_STATUSES.includes(
        status as (typeof ALLOWED_LEAD_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Invalid lead status" },
        { status: 400 },
      );
    }

    const { id: leadId } = await params;

    // Aislamiento Multitenant: Get tenantId from session
    const tenantId = user.tenantId; // Simplified, assuming user is tied to active tenant in current context
    if (!tenantId) throw new Error("No active tenant found in session");

    const tPrisma = getTenantPrisma(tenantId);

    // 1. Update Lead Status
    const updatedLead = await tPrisma.lead.update({
      where: { id: leadId },
      data: { status },
      select: { id: true, status: true, updatedAt: true, tenantId: true },
    });

    // 2. TRIGGER CONVERSION: If status is CONVERTED or QUALIFIED, create a Deal automatically
    let deal = null;
    if (status === "CONVERTED" || status === "QUALIFIED") {
      deal = await LeadConversionService.convertToDeal(tenantId, leadId, user.id);
    }

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      dealId: deal?.id
    });
  } catch (error) {
    console.error("[Lead Status API Error]:", error);
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Failed to update lead status" },
      { status: 500 },
    );
  }
}
