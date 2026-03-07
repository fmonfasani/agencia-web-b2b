import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { ProposalPdfDocument } from "@/lib/proposals/proposal.pdf";

describe("Proposal PDF", () => {
  it("PDF se genera sin errores", async () => {
    const doc = ProposalPdfDocument({
      title: "Propuesta para Delta SA",
      problem: "Problema de captacion online",
      solution: "Solucion integral de marketing",
      deliverables: ["Landing page", "SEO", "Ads"],
      timeline: "8-10 semanas",
      investment: "USD 4.000 - 8.000",
      roi: "30% mas leads",
      companyName: "Delta SA",
      tenantName: "Agencia B2B",
      contactEmail: "hola@agencia.com",
    });

    const buffer = await renderToBuffer(doc);

    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("Contiene titulo y empresa correctos", async () => {
    const title = "Propuesta para Acme";
    const companyName = "Acme Corp";

    const doc = ProposalPdfDocument({
      title,
      problem: "Problema",
      solution: "Solucion",
      deliverables: ["Entregable 1"],
      timeline: "4-6 semanas",
      investment: "USD 2.000 - 4.000",
      roi: null,
      companyName,
      tenantName: "Agencia B2B",
      contactEmail: "hola@agencia.com",
    });

    const buffer = await renderToBuffer(doc);
    const content = buffer.toString("latin1");

    expect(content).toContain("Propuesta para Acme");
    expect(content).toContain("Acme Corp");
  });
});
