import { NextRequest, NextResponse } from "next/server";
import { LeadPipelineService } from "@/lib/leads/pipeline/pipeline.service";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ status: string }> },
) {
  const { status } = await params;

  if (!LeadPipelineService.isPipelineStatus(status)) {
    return NextResponse.json({ error: `Invalid status '${status}'.` }, { status: 400 });
  }

  const limitParam = Number(new URL(req.url).searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? limitParam : 50;

  let tenantId: string;
  try {
    tenantId = requireTenantId(req.headers.get("x-tenant-id"));
  } catch (error) {
    const message = error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const leads = await LeadPipelineService.getLeadsByStatus(tenantId, status, limit);
    return NextResponse.json({ count: leads.length, leads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
