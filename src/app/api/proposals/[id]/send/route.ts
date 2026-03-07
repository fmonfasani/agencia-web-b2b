import { NextRequest, NextResponse } from "next/server";
import { ProposalService } from "@/lib/proposals/proposal.service";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let tenantId: string;
  try {
    tenantId = requireTenantId(req.headers.get("x-tenant-id"));
  } catch (error) {
    const message = error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const sent = await ProposalService.sendProposal(tenantId, id);
    return NextResponse.json(sent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
