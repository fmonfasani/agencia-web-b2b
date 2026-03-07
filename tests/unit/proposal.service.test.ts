import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineStatus } from "@prisma/client";
import { ProposalService } from "@/lib/proposals/proposal.service";
import { aiEngine } from "@/lib/ai/engine";
import { LeadPipelineService } from "@/lib/leads/pipeline/pipeline.service";
import { getTenantPrisma } from "@/lib/prisma";

const sendEmailMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: sendEmailMock,
    },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  getTenantPrisma: vi.fn(),
}));

vi.mock("@/lib/ai/engine", () => ({
  aiEngine: {
    generateWithFallback: vi.fn(),
  },
}));

vi.mock("@/lib/leads/pipeline/pipeline.service", () => ({
  LeadPipelineService: {
    advancePipeline: vi.fn(),
  },
}));

const leadFindFirstMock = vi.fn();
const proposalUpsertMock = vi.fn();
const proposalFindFirstMock = vi.fn();
const proposalUpdateMock = vi.fn();

describe("ProposalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.SMTP_FROM_EMAIL = "ops@example.com";

    vi.mocked(getTenantPrisma).mockReturnValue({
      lead: {
        findFirst: leadFindFirstMock,
      },
      proposal: {
        upsert: proposalUpsertMock,
        findFirst: proposalFindFirstMock,
        update: proposalUpdateMock,
      },
    } as unknown as ReturnType<typeof getTenantPrisma>);
  });

  it("Lead en LLAMADO genera propuesta correctamente", async () => {
    leadFindFirstMock.mockResolvedValueOnce({
      id: "lead-1",
      tenantId: "tenant-a",
      name: "Delta",
      companyName: "Delta SA",
      industry: "software",
      estimatedCompanySize: "11-50",
      pipelineStatus: PipelineStatus.LLAMADO,
      brief: "Brief generado",
    });

    vi.mocked(aiEngine.generateWithFallback).mockResolvedValueOnce(
      JSON.stringify({
        title: "Propuesta para Delta SA: Growth",
        problem: "Tienen baja captacion online.",
        solution: "Implementamos estrategia full-funnel.",
        deliverables: ["Landing", "SEO", "Ads"],
        timeline: "8-10 semanas",
        investment: "USD 4.000 - 8.000",
        roi: "Incremento esperado del 30% en leads",
        content: "# Propuesta completa\n".repeat(30),
      }),
    );

    proposalUpsertMock.mockResolvedValueOnce({
      id: "proposal-1",
      leadId: "lead-1",
      status: "DRAFT",
      title: "Propuesta para Delta SA: Growth",
    });

    const proposal = await ProposalService.generateProposal("tenant-a", "lead-1", "Notas de llamada");

    expect(proposal.id).toBe("proposal-1");
    expect(aiEngine.generateWithFallback).toHaveBeenCalledTimes(1);
    expect(proposalUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { leadId: "lead-1" },
        create: expect.objectContaining({ status: "DRAFT" }),
      }),
    );
  });

  it("Lead en otro estado lanza error", async () => {
    leadFindFirstMock.mockResolvedValueOnce({
      id: "lead-2",
      pipelineStatus: PipelineStatus.CITADO,
      brief: "Brief generado",
    });

    await expect(
      ProposalService.generateProposal("tenant-a", "lead-2", "Notas"),
    ).rejects.toThrow("must be in LLAMADO status");

    expect(aiEngine.generateWithFallback).not.toHaveBeenCalled();
    expect(proposalUpsertMock).not.toHaveBeenCalled();
  });

  it("Enviar propuesta llama Resend y avanza lead", async () => {
    proposalFindFirstMock.mockResolvedValueOnce({
      id: "proposal-3",
      title: "Propuesta para Delta",
      problem: "Problema",
      lead: {
        id: "lead-3",
        name: "Lucia",
        companyName: "Delta SA",
        email: "lucia@delta.com",
      },
    });

    sendEmailMock.mockResolvedValueOnce({
      data: { id: "email-1" },
      error: null,
    });

    proposalUpdateMock.mockResolvedValueOnce({
      id: "proposal-3",
      status: "SENT",
      lead: { id: "lead-3", pipelineStatus: PipelineStatus.LLAMADO },
    });

    vi.mocked(LeadPipelineService.advancePipeline).mockResolvedValueOnce({ id: "lead-3" } as never);

    const result = await ProposalService.sendProposal("tenant-a", "proposal-3");

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "lucia@delta.com",
        subject: expect.stringContaining("Propuesta lista"),
      }),
    );
    expect(LeadPipelineService.advancePipeline).toHaveBeenCalledWith(
      "tenant-a",
      "lead-3",
      PipelineStatus.PROPUESTA_ENVIADA,
      expect.objectContaining({ proposalId: "proposal-3" }),
    );
    expect(result.status).toBe("SENT");
  });
});
