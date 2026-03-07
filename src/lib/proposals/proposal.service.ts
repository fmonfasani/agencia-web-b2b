import { PipelineStatus } from "@prisma/client";
import { Resend } from "resend";
import { aiEngine } from "@/lib/ai/engine";
import { LeadPipelineService } from "@/lib/leads/pipeline/pipeline.service";
import { getTenantPrisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import { PROPOSAL_SYSTEM_PROMPT, PROPOSAL_USER_PROMPT } from "./proposal.prompts";

type ProposalStatusValue = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED";

interface ProposalPayload {
  title: string;
  problem: string;
  solution: string;
  deliverables: string[];
  timeline: string;
  investment: string;
  roi: string | null;
  content: string;
}

interface ListProposalFilters {
  status?: ProposalStatusValue;
  leadId?: string;
}

interface UpdateProposalInput {
  title?: string;
  problem?: string;
  solution?: string;
  deliverables?: string[];
  timeline?: string;
  investment?: string;
  roi?: string | null;
  content?: string;
  viewedAt?: Date | null;
  viewCount?: number;
  status?: ProposalStatusValue;
}

function getResendClient(): Resend | null {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart) {
    throw new Error("AI response did not contain a valid JSON object.");
  }

  const parsed: unknown = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  if (!isRecord(parsed)) {
    throw new Error("AI response JSON was not an object.");
  }

  return parsed;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseProposalPayload(raw: string): ProposalPayload {
  const parsed = parseJsonObject(raw);

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const problem = typeof parsed.problem === "string" ? parsed.problem.trim() : "";
  const solution = typeof parsed.solution === "string" ? parsed.solution.trim() : "";
  const deliverables = toStringArray(parsed.deliverables);
  const timeline = typeof parsed.timeline === "string" ? parsed.timeline.trim() : "";
  const investment = typeof parsed.investment === "string" ? parsed.investment.trim() : "";
  const roi = typeof parsed.roi === "string" && parsed.roi.trim().length > 0
    ? parsed.roi.trim()
    : null;
  const content = typeof parsed.content === "string" ? parsed.content.trim() : "";

  if (!title || !problem || !solution || !timeline || !investment || !content || deliverables.length === 0) {
    throw new Error("AI response did not include all required proposal fields.");
  }

  return {
    title,
    problem,
    solution,
    deliverables,
    timeline,
    investment,
    roi,
    content,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function assertProposalStatus(value: string): ProposalStatusValue {
  const allowed: ProposalStatusValue[] = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED"];
  if (!allowed.includes(value as ProposalStatusValue)) {
    throw new Error(`Invalid proposal status '${value}'.`);
  }

  return value as ProposalStatusValue;
}

export const ProposalService = {
  async generateProposal(tenantId: string, leadId: string, callNotes: string) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId) as ReturnType<typeof getTenantPrisma> & {
      proposal: any;
    };

    const lead = await tPrisma.lead.findFirst({
      where: { id: leadId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        companyName: true,
        industry: true,
        estimatedCompanySize: true,
        pipelineStatus: true,
        brief: true,
      },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found for tenant ${activeTenantId}.`);
    }

    if (lead.pipelineStatus !== PipelineStatus.LLAMADO) {
      throw new Error(
        `Lead ${leadId} must be in LLAMADO status to generate a proposal. Current status: ${lead.pipelineStatus}.`,
      );
    }

    if (!lead.brief || lead.brief.trim().length === 0) {
      throw new Error(`Lead ${leadId} has no brief to build a proposal.`);
    }

    const prompt = PROPOSAL_USER_PROMPT({
      companyName: lead.companyName ?? lead.name ?? "Empresa",
      industry: lead.industry ?? "servicios",
      employeeRange: lead.estimatedCompanySize ?? "No especificado",
      brief: lead.brief,
      callNotes,
    });

    const aiResponse = await aiEngine.generateWithFallback(
      [
        {
          role: "system",
          content: PROPOSAL_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      activeTenantId,
    );

    const proposalPayload = parseProposalPayload(aiResponse);
    const slugBase = slugify(proposalPayload.title) || `propuesta-${lead.id}`;
    const slug = `${slugBase}-${lead.id.slice(-6)}`;

    const proposal = await tPrisma.proposal.upsert({
      where: { leadId: lead.id },
      update: {
        title: proposalPayload.title,
        problem: proposalPayload.problem,
        solution: proposalPayload.solution,
        deliverables: proposalPayload.deliverables,
        timeline: proposalPayload.timeline,
        investment: proposalPayload.investment,
        roi: proposalPayload.roi,
        content: proposalPayload.content,
        slug,
        status: "DRAFT",
      },
      create: {
        leadId: lead.id,
        tenantId: activeTenantId,
        title: proposalPayload.title,
        problem: proposalPayload.problem,
        solution: proposalPayload.solution,
        deliverables: proposalPayload.deliverables,
        timeline: proposalPayload.timeline,
        investment: proposalPayload.investment,
        roi: proposalPayload.roi,
        content: proposalPayload.content,
        slug,
        status: "DRAFT",
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            pipelineStatus: true,
          },
        },
      },
    });

    return proposal;
  },

  async sendProposal(tenantId: string, proposalId: string) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId) as ReturnType<typeof getTenantPrisma> & {
      proposal: any;
    };

    const proposal = await tPrisma.proposal.findFirst({
      where: { id: proposalId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found for tenant ${activeTenantId}.`);
    }

    if (!proposal.lead?.email) {
      throw new Error("Lead has no email to send proposal.");
    }

    const resend = getResendClient();
    if (!resend) {
      throw new Error("Resend API Key missing.");
    }

    const fromEmail = process.env.SMTP_FROM_EMAIL || "no-reply@agencialeads.com";
    const company = proposal.lead.companyName ?? proposal.lead.name ?? "tu empresa";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: proposal.lead.email,
      subject: `Propuesta lista para ${company}`,
      html: `<div style="font-family: sans-serif; line-height: 1.5;">
        <h2>${proposal.title}</h2>
        <p>Hola, compartimos tu propuesta comercial personalizada.</p>
        <p><strong>Template:</strong> proposal-ready</p>
        <p>Resumen: ${proposal.problem}</p>
      </div>`,
      tags: [{ name: "template", value: "proposal-ready" }],
    });

    if (error) {
      throw new Error(error.message || "Failed to send proposal email.");
    }

    const updated = await tPrisma.proposal.update({
      where: { id: proposal.id },
      data: {
        sentAt: new Date(),
        status: "SENT",
      },
      include: {
        lead: {
          select: {
            id: true,
            pipelineStatus: true,
          },
        },
      },
    });

    await LeadPipelineService.advancePipeline(
      activeTenantId,
      proposal.lead.id,
      PipelineStatus.PROPUESTA_ENVIADA,
      {
        proposalId: proposal.id,
        reason: "proposal_sent",
        emailId: data?.id ?? null,
      },
    );

    return updated;
  },

  async listProposals(tenantId: string, filters?: ListProposalFilters) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId) as ReturnType<typeof getTenantPrisma> & {
      proposal: any;
    };

    const where: Record<string, unknown> = {};

    if (filters?.status) {
      where.status = assertProposalStatus(filters.status);
    }
    if (filters?.leadId) {
      where.leadId = filters.leadId;
    }

    return tPrisma.proposal.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            companyName: true,
            pipelineStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  },

  async getProposalById(tenantId: string, proposalId: string) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId) as ReturnType<typeof getTenantPrisma> & {
      proposal: any;
    };

    return tPrisma.proposal.findFirst({
      where: { id: proposalId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            pipelineStatus: true,
          },
        },
      },
    });
  },

  async updateProposal(tenantId: string, proposalId: string, input: UpdateProposalInput) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId) as ReturnType<typeof getTenantPrisma> & {
      proposal: any;
    };

    const data: Record<string, unknown> = {};

    if (typeof input.title === "string") data.title = input.title;
    if (typeof input.problem === "string") data.problem = input.problem;
    if (typeof input.solution === "string") data.solution = input.solution;
    if (Array.isArray(input.deliverables)) data.deliverables = input.deliverables;
    if (typeof input.timeline === "string") data.timeline = input.timeline;
    if (typeof input.investment === "string") data.investment = input.investment;
    if (typeof input.roi === "string" || input.roi === null) data.roi = input.roi;
    if (typeof input.content === "string") data.content = input.content;
    if (input.viewedAt instanceof Date || input.viewedAt === null) data.viewedAt = input.viewedAt;
    if (typeof input.viewCount === "number") data.viewCount = input.viewCount;
    if (typeof input.status === "string") data.status = assertProposalStatus(input.status);

    return tPrisma.proposal.update({
      where: { id: proposalId },
      data,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            companyName: true,
            pipelineStatus: true,
          },
        },
      },
    });
  },
};
