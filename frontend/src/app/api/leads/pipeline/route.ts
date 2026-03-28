import { NextRequest, NextResponse } from "next/server";
import { PipelineStatus } from "@prisma/client";
import { LeadPipelineService } from "@/lib/leads/pipeline/pipeline.service";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";

interface PipelinePatchRequest {
  leadId: string;
  status: string;
  notes?: string;
}

function isPatchPayload(body: unknown): body is PipelinePatchRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "leadId" in body &&
    "status" in body &&
    typeof (body as { leadId: unknown }).leadId === "string" &&
    typeof (body as { status: unknown }).status === "string"
  );
}

function resolveTenantId(req: NextRequest): string {
  return requireTenantId(req.headers.get("x-tenant-id"));
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
    const stats = await LeadPipelineService.getPipelineStats(tenantId);
    return NextResponse.json(stats);
  } catch (error) {
    const message =
      error instanceof TenantContextError || error instanceof Error
        ? error.message
        : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isPatchPayload(body)) {
    return NextResponse.json(
      { error: "Body must include leadId and status." },
      { status: 400 },
    );
  }

  if (!LeadPipelineService.isPipelineStatus(body.status)) {
    return NextResponse.json(
      { error: `Invalid status '${body.status}'.` },
      { status: 400 },
    );
  }

  try {
    const tenantId = resolveTenantId(req);
    const updated = await LeadPipelineService.advancePipeline(
      tenantId,
      body.leadId,
      body.status as PipelineStatus,
      body.notes ? { notes: body.notes } : undefined,
    );
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const statusCode = message.startsWith("Invalid pipeline transition") ? 409 : 400;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
