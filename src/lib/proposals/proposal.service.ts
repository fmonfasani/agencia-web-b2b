import { PipelineStatus } from "@prisma/client";
import { aiEngine } from "@/lib/ai/engine";
import { LeadPipelineService } from "@/lib/leads/pipeline/pipeline.service";
import { getTenantPrisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import { sendEmail } from "@/lib/mail";
import {
  PROPOSAL_SYSTEM_PROMPT,
  PROPOSAL_USER_PROMPT,
} from "./proposal.prompts";

type ProposalStatusValue =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED";

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
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function parseProposalPayload(raw: string): ProposalPayload {
  const parsed = parseJsonObject(raw);

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const problem =
    typeof parsed.problem === "string" ? parsed.problem.trim() : "";
  const solution =
    typeof parsed.solution === "string" ? parsed.solution.trim() : "";
  const deliverables = toStringArray(parsed.deliverables);
  const timeline =
    typeof parsed.timeline === "string" ? parsed.timeline.trim() : "";
  const investment =
    typeof parsed.investment === "string" ? parsed.investment.trim() : "";
  const roi =
    typeof parsed.roi === "string" && parsed.roi.trim().length > 0
      ? parsed.roi.trim()
      : null;
  const content =
    typeof parsed.content === "string" ? parsed.content.trim() : "";

  if (
    !title ||
    !problem ||
    !solution ||
    !timeline ||
    !investment ||
    !content ||
    deliverables.length === 0
  ) {
    throw new Error(
      "AI response did not include all required proposal fields.",
    );
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
  const allowed: ProposalStatusValue[] = [
    "DRAFT",
    "SENT",
    "VIEWED",
    "ACCEPTED",
    "REJECTED",
  ];
  if (!allowed.includes(value as ProposalStatusValue)) {
    throw new Error(`Invalid proposal status '${value}'.`);
  }

  return value as ProposalStatusValue;
}

export const ProposalService = {
  async generateProposal(tenantId: string, leadId: string, callNotes: string) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId) as ReturnType<
      typeof getTenantPrisma
    > & {
      proposal: any;
    };

    const lead = await tPrisma.lead.findFirst({
      where: { id: leadId },
      include: {
        intelligence: true,
      },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found for tenant ${activeTenantId}.`);
    }

    const allowedStatuses = [
      PipelineStatus.ELEGIDO,
      PipelineStatus.ENTREVISTA,
      PipelineStatus.CALIFICADO,
      PipelineStatus.LLAMADO,
    ];

    if (!allowedStatuses.includes(lead.pipelineStatus)) {
      throw new Error(
        `Lead ${leadId} debe estar en estado ELEGIDO, ENTREVISTA, CALIFICADO o LLAMADO para generar una propuesta. Estado actual: ${lead.pipelineStatus}.`,
      );
    }

    const intelligence = lead.intelligence;
    const strategicContext = `
      AUDITORÍA: ${intelligence?.strategicBrief || "No disponible"}
      MERCADO: ${intelligence?.marketAnalysis || "No disponible"}
      VENTAS SUGERIDAS: ${intelligence?.interviewGuide || "No disponible"}
      NICHO: ${intelligence?.nicheAnalysis || "No disponible"}
    `;

    const prompt = PROPOSAL_USER_PROMPT({
      companyName: lead.companyName ?? lead.name ?? "Empresa",
      industry: lead.industry ?? "servicios",
      employeeRange: lead.estimatedCompanySize ?? "No especificado",
      brief: strategicContext,
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
    const tPrisma = getTenantPrisma(activeTenantId) as ReturnType<
      typeof getTenantPrisma
    > & {
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
      throw new Error(
        `Proposal ${proposalId} not found for tenant ${activeTenantId}.`,
      );
    }

    if (!proposal.lead?.email) {
      throw new Error("Lead has no email to send proposal.");
    }

    const fromName = process.env.SMTP_FROM_NAME || "Revenue OS";
    const fromEmail =
      process.env.SMTP_FROM_EMAIL || "no-reply@agencialeads.com";
    const company =
      proposal.lead.companyName ?? proposal.lead.name ?? "tu empresa";

    const baseUrl = process.env.NEXTAUTH_URL?.includes("localhost")
      ? "https://agencia-web-b2b.vercel.app"
      : process.env.NEXTAUTH_URL || "https://agencia-web-b2b.vercel.app";

    const proposalUrl = `${baseUrl}/p/${proposal.slug}`;

    const { success, data, error } = await sendEmail({
      to: proposal.lead.email,
      fromName,
      fromEmail,
      subject: `Propuesta Estratégica para ${company}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #4f46e5;">Hola ${proposal.lead.name},</h2>
          <p>Es un gusto saludarte. Hemos preparado la propuesta comercial personalizada para <strong>${company}</strong> basándonos en nuestra última conversación y el análisis de mercado realizado.</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin-top: 0; font-size: 16px;">${proposal.title}</h3>
            <p style="font-size: 14px; color: #4b5563;">${proposal.problem}</p>
            <a href="${proposalUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Ver Propuesta Online</a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">Si tienes alguna duda o quieres realizar ajustes, puedes responder directamente a este correo.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Revenue OS • Agencia de Crecimiento Estratégico</p>
        </div>
      `,
      tags: [{ name: "template", value: "proposal-ready" }],
    });

    if (!success) {
      const errorObj = error as unknown as Record<string, unknown>;
      const msg =
        typeof errorObj?.message === "string"
          ? errorObj.message
          : "Failed to send proposal email.";
      throw new Error(msg);
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
        emailId: (data as any)?.id || (data as any)?.messageId || null,
      },
    );

    return updated;
  },

  async listProposals(tenantId: string, filters?: ListProposalFilters) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId) as ReturnType<
      typeof getTenantPrisma
    > & {
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
    const tPrisma = getTenantPrisma(activeTenantId) as ReturnType<
      typeof getTenantPrisma
    > & {
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

  async updateProposal(
    tenantId: string,
    proposalId: string,
    input: UpdateProposalInput,
  ) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId) as ReturnType<
      typeof getTenantPrisma
    > & {
      proposal: any;
    };

    const data: Record<string, unknown> = {};

    if (typeof input.title === "string") data.title = input.title;
    if (typeof input.problem === "string") data.problem = input.problem;
    if (typeof input.solution === "string") data.solution = input.solution;
    if (Array.isArray(input.deliverables))
      data.deliverables = input.deliverables;
    if (typeof input.timeline === "string") data.timeline = input.timeline;
    if (typeof input.investment === "string")
      data.investment = input.investment;
    if (typeof input.roi === "string" || input.roi === null)
      data.roi = input.roi;
    if (typeof input.content === "string") data.content = input.content;
    if (input.viewedAt instanceof Date || input.viewedAt === null)
      data.viewedAt = input.viewedAt;
    if (typeof input.viewCount === "number") data.viewCount = input.viewCount;
    if (typeof input.status === "string")
      data.status = assertProposalStatus(input.status);

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
