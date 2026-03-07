import { NextRequest, NextResponse } from "next/server";
import { ProposalService } from "@/lib/proposals/proposal.service";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";

function resolveTenantId(req: NextRequest): string {
  return requireTenantId(req.headers.get("x-tenant-id"));
}

export async function GET(req: NextRequest) {
  let tenantId: string;
  try {
    tenantId = resolveTenantId(req);
  } catch (error) {
    const message = error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const params = new URL(req.url).searchParams;
  const status = params.get("status") ?? undefined;
  const leadId = params.get("leadId") ?? undefined;

  try {
    const proposals = await ProposalService.listProposals(tenantId, {
      status: status as "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | undefined,
      leadId,
    });

    return NextResponse.json({ count: proposals.length, proposals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  let tenantId: string;
  try {
    tenantId = resolveTenantId(req);
  } catch (error) {
    const message = error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body is required." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const leadId = typeof payload.leadId === "string" ? payload.leadId : null;
  const callNotes = typeof payload.callNotes === "string" ? payload.callNotes : null;

  if (!leadId || !callNotes) {
    return NextResponse.json(
      { error: "Body must include leadId and callNotes." },
      { status: 400 },
    );
  }

  try {
    const proposal = await ProposalService.generateProposal(tenantId, leadId, callNotes);
    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
