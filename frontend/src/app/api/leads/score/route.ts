import { NextRequest, NextResponse } from "next/server";
import { LeadScoringService } from "@/lib/leads/scoring/scoring.service";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";

interface ScoreSingleRequest {
  leadId: string;
}

interface ScoreBatchRequest {
  limit?: number;
}

function hasLeadId(body: unknown): body is ScoreSingleRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "leadId" in body &&
    typeof (body as { leadId: unknown }).leadId === "string"
  );
}

function hasLimit(body: unknown): body is ScoreBatchRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "limit" in body &&
    typeof (body as { limit: unknown }).limit === "number"
  );
}

export async function POST(req: NextRequest) {
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
    const message = error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (hasLeadId(body)) {
      const result = await LeadScoringService.scoreLead(tenantId, body.leadId);
      return NextResponse.json(result, { status: result.status === "scored" ? 200 : 502 });
    }

    const batchLimit = hasLimit(body) ? body.limit : 10;
    const result = await LeadScoringService.scoreBatch(tenantId, batchLimit);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
