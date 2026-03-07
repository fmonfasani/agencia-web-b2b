import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { ProposalPdfDocument } from "@/lib/proposals/proposal.pdf";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";

function parseDeliverables(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
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

  const tPrisma = getTenantPrisma(tenantId) as ReturnType<typeof getTenantPrisma> & {
    proposal: any;
    tenant: any;
  };

  try {
    const proposal = await tPrisma.proposal.findFirst({
      where: { id },
      include: {
        lead: {
          select: {
            name: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
    }

    const tenant = await tPrisma.tenant.findFirst({
      where: { id: tenantId },
      select: {
        name: true,
        email: true,
        branding: true,
      },
    });

    const branding = (tenant?.branding ?? {}) as Record<string, unknown>;
    const tenantLogoUrl = typeof branding.logoUrl === "string" ? branding.logoUrl : null;

    const pdf = ProposalPdfDocument({
      title: proposal.title,
      problem: proposal.problem,
      solution: proposal.solution,
      deliverables: parseDeliverables(proposal.deliverables),
      timeline: proposal.timeline,
      investment: proposal.investment,
      roi: proposal.roi,
      companyName: proposal.lead.companyName ?? proposal.lead.name ?? "Empresa",
      tenantName: tenant?.name ?? "Agencia",
      tenantLogoUrl,
      contactEmail: tenant?.email ?? proposal.lead.email ?? null,
    });

    const buffer = await renderToBuffer(pdf);
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="propuesta-${proposal.slug}.pdf"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
