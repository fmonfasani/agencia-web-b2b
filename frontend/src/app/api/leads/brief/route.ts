import { NextRequest, NextResponse } from "next/server";
import { LeadBriefService } from "@/lib/leads/brief/brief.service";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";
import { requireTenantMembership, AuthorizationError } from "@/lib/authz";

interface BriefSingleRequest {
  leadId: string;
}

interface BriefBatchRequest {
  limit?: number;
}

function hasLeadId(body: unknown): body is BriefSingleRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "leadId" in body &&
    typeof (body as { leadId: unknown }).leadId === "string"
  );
}

function hasLimit(body: unknown): body is BriefBatchRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "limit" in body &&
    typeof (body as { limit: unknown }).limit === "number"
  );
}

export async function POST(req: NextRequest) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let tenantId: string;
  try {
    tenantId = requireTenantId(req.headers.get("x-tenant-id"));
  } catch (error) {
    const message =
      error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (hasLeadId(body)) {
      const result = await LeadBriefService.generateBrief(
        tenantId,
        body.leadId,
      );
      const statusCode = result.status === "failed" ? 502 : 200;
      return NextResponse.json(result, { status: statusCode });
    }

    const batchLimit = hasLimit(body) ? body.limit : 5;
    const result = await LeadBriefService.generateBatch(tenantId, batchLimit);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
