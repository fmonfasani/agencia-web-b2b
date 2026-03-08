import { getTenantPrisma } from "@/lib/prisma";
import { ProposalPdfDocument } from "@/lib/proposals/proposal.pdf";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = req.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 },
      );
    }

    const { id } = await params;

    const tPrisma = getTenantPrisma(tenantId);
    const proposal = await tPrisma.proposal.findUnique({
      where: { id: id },
      include: {
        lead: {
          select: {
            companyName: true,
            name: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 },
      );
    }

    const tenant = await tPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        branding: true,
        whatsapp: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const branding =
      (tenant.branding as {
        logoUrl?: string;
        logo?: string;
        supportEmail?: string;
      } | null) || {};

    // Prepare data for the PDF component
    const pdfData = {
      title: proposal.title,
      problem: proposal.problem,
      solution: proposal.solution,
      deliverables: proposal.deliverables as string[],
      timeline: proposal.timeline,
      investment: proposal.investment,
      roi: proposal.roi || "Alto Impacto",
      companyName: proposal.lead.companyName || proposal.lead.name || "Cliente",
      tenantName: tenant.name,
      tenantLogoUrl: branding.logoUrl || branding.logo || null,
      contactEmail:
        branding.supportEmail || tenant.whatsapp || "contacto@agencia.com",
    };

    const pdfBuffer = await renderToBuffer(ProposalPdfDocument(pdfData));

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="propuesta-${proposal.slug}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[PROPOSAL_PDF_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
