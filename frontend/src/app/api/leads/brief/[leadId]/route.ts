import { NextRequest, NextResponse } from "next/server";
import { LeadBriefService } from "@/lib/leads/brief/brief.service";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";
import { requireTenantMembership, AuthorizationError } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  // SECURITY: Require authenticated tenant member
  try {
    await requireTenantMembership();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await params;

  let tenantId: string;
  try {
    tenantId = requireTenantId(req.headers.get("x-tenant-id"));
  } catch (error) {
    const message =
      error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const brief = await LeadBriefService.getLeadBrief(tenantId, leadId);
    if (!brief) {
      return NextResponse.json(
        { message: "No brief found for this lead." },
        { status: 404 },
      );
    }
    return NextResponse.json({ leadId, brief });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
