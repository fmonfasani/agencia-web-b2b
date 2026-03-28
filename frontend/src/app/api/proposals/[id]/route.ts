import { NextRequest, NextResponse } from "next/server";
import { ProposalService } from "@/lib/proposals/proposal.service";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";

function parseDate(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function GET(
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
    const proposal = await ProposalService.getProposalById(tenantId, id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
    }
    return NextResponse.json(proposal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
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

  try {
    const updated = await ProposalService.updateProposal(tenantId, id, {
      title: typeof payload.title === "string" ? payload.title : undefined,
      problem: typeof payload.problem === "string" ? payload.problem : undefined,
      solution: typeof payload.solution === "string" ? payload.solution : undefined,
      deliverables: Array.isArray(payload.deliverables)
        ? payload.deliverables.filter((item): item is string => typeof item === "string")
        : undefined,
      timeline: typeof payload.timeline === "string" ? payload.timeline : undefined,
      investment: typeof payload.investment === "string" ? payload.investment : undefined,
      roi: typeof payload.roi === "string" || payload.roi === null ? payload.roi : undefined,
      content: typeof payload.content === "string" ? payload.content : undefined,
      status: typeof payload.status === "string"
        ? (payload.status as "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED")
        : undefined,
      viewedAt: parseDate(payload.viewedAt),
      viewCount: typeof payload.viewCount === "number" ? payload.viewCount : undefined,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
