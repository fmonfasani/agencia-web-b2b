import { NextRequest, NextResponse } from "next/server";
import { ProposalService } from "@/lib/proposals/proposal.service";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let tenantId: string;
  try {
    tenantId = requireTenantId(req.headers.get("x-tenant-id"));
  } catch (error) {
    const message = error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { id: proposalId } = await params;

  try {
    const updated = await ProposalService.sendProposal(tenantId, proposalId);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
