import { PipelineStatus } from "@prisma/client";
import { aiEngine } from "@/lib/ai/engine";
import { getTenantPrisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import { BRIEF_PROMPT } from "./brief.prompts";

interface Competitor {
  name: string;
  website?: string;
  summary?: string;
}

export interface BriefSuccessResult {
  leadId: string;
  status: "generated";
  brief: string;
  competitors: Competitor[];
}

export interface BriefSkippedResult {
  leadId: string;
  status: "skipped";
  reason: string;
}

export interface BriefFailedResult {
  leadId: string;
  status: "failed";
  error: string;
}

export type BriefResult = BriefSuccessResult | BriefSkippedResult | BriefFailedResult;

export interface BatchBriefResult {
  processed: number;
  generated: number;
  skipped: number;
  failed: number;
  results: BriefResult[];
}

function toSlugHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function stripCompetitorSection(markdown: string): string {
  return markdown
    .replace(
      /\n\*\*Cómo están sus competidores:\*\*[\s\S]*?(?=\n\*\*Opener sugerido:\*\*)/m,
      "\n",
    )
    .trim();
}

function parseCompetitorsPayload(payload: unknown, leadWebsite: string | null): Competitor[] {
  const leadHost = toSlugHost(leadWebsite);
  const candidates: Competitor[] = [];

  const asRecord = (value: unknown): Record<string, unknown> | null =>
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

  const data = asRecord(payload);
  if (!data) return [];

  const arraysToInspect: unknown[] = [];
  if (Array.isArray(data.data)) arraysToInspect.push(...data.data);
  if (Array.isArray(data.results)) arraysToInspect.push(...data.results);
  if (Array.isArray(data.documents)) arraysToInspect.push(...data.documents);

  for (const item of arraysToInspect) {
    const record = asRecord(item);
    if (!record) continue;

    const name = typeof record.title === "string"
      ? record.title
      : typeof record.name === "string"
        ? record.name
        : null;
    const website = typeof record.url === "string"
      ? record.url
      : typeof record.website === "string"
        ? record.website
        : undefined;
    const summary = typeof record.description === "string"
      ? record.description
      : typeof record.snippet === "string"
        ? record.snippet
        : undefined;

    if (!name) continue;
    if (leadHost && toSlugHost(website) === leadHost) continue;

    candidates.push({ name, website, summary });
  }

  return candidates.slice(0, 3);
}

async function findCompetitors(lead: {
  name: string | null;
  companyName: string | null;
  website: string | null;
  industry: string | null;
  category: string | null;
}): Promise<Competitor[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];

  const company = lead.companyName ?? lead.name ?? "empresa";
  const industry = lead.industry ?? lead.category ?? "servicios";
  const query = `competidores de ${company} en ${industry} argentina`;
  const endpoint = process.env.FIRECRAWL_SEARCH_URL ?? "https://api.firecrawl.dev/v1/search";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        limit: 5,
        includeMarkdown: false,
      }),
    });

    if (!response.ok) {
      return [];
    }

    const payload: unknown = await response.json();
    return parseCompetitorsPayload(payload, lead.website);
  } catch {
    return [];
  }
}

export class LeadBriefService {
  static async generateBrief(tenantId: string, leadId: string): Promise<BriefResult> {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);

    const lead = await tPrisma.lead.findFirst({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        companyName: true,
        score: true,
        scoreReason: true,
        recommendedService: true,
        website: true,
        industry: true,
        category: true,
        description: true,
        technologies: true,
        websiteScore: true,
        socialPresence: true,
        designQuality: true,
        estimatedCompanySize: true,
        pipelineStatus: true,
        address: true,
      },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found for tenant ${activeTenantId}.`);
    }

    if ((lead.score ?? 0) < 7) {
      return {
        leadId,
        status: "skipped",
        reason: "Lead score is below 7.",
      };
    }

    const competitors = await findCompetitors({
      name: lead.name,
      companyName: lead.companyName,
      website: lead.website,
      industry: lead.industry,
      category: lead.category,
    });

    const leadData = {
      id: lead.id,
      name: lead.name,
      companyName: lead.companyName,
      score: lead.score,
      scoreReason: lead.scoreReason,
      recommendedService: lead.recommendedService,
      website: lead.website,
      industry: lead.industry ?? lead.category,
      description: lead.description,
      technologies: lead.technologies,
      websiteScore: lead.websiteScore,
      socialPresence: lead.socialPresence,
      designQuality: lead.designQuality,
      estimatedCompanySize: lead.estimatedCompanySize,
      address: lead.address,
      pipelineStatus: lead.pipelineStatus,
    };

    const competitorsData = competitors.length > 0 ? competitors : "No competitors found";
    const prompt = BRIEF_PROMPT
      .replace("{LEAD_DATA}", JSON.stringify(leadData, null, 2))
      .replace("{COMPETITORS_DATA}", JSON.stringify(competitorsData, null, 2));

    let brief: string;
    try {
      brief = await aiEngine.generateWithFallback(
        [
          {
            role: "system",
            content: "You are a senior B2B sales strategist. Output markdown only.",
          },
          { role: "user", content: prompt },
        ],
        activeTenantId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown brief generation error";
      return {
        leadId,
        status: "failed",
        error: message,
      };
    }

    const normalizedBrief = competitors.length === 0 ? stripCompetitorSection(brief) : brief.trim();

    await tPrisma.lead.update({
      where: { id: lead.id },
      data: {
        brief: normalizedBrief,
        pipelineStatus: PipelineStatus.INVESTIGADO,
      },
    });

    return {
      leadId: lead.id,
      status: "generated",
      brief: normalizedBrief,
      competitors,
    };
  }

  static async generateBatch(tenantId: string, limit = 5): Promise<BatchBriefResult> {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);
    const safeLimit = Math.max(1, Math.min(limit, 50));

    const leads = await tPrisma.lead.findMany({
      where: {
        score: { gte: 7 },
        brief: null,
      },
      take: safeLimit,
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const results: BriefResult[] = [];
    for (const lead of leads) {
      const result = await this.generateBrief(activeTenantId, lead.id);
      results.push(result);
    }

    return {
      processed: results.length,
      generated: results.filter((r) => r.status === "generated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    };
  }

  static async getLeadBrief(tenantId: string, leadId: string): Promise<string | null> {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);

    const lead = await tPrisma.lead.findFirst({
      where: { id: leadId },
      select: { brief: true },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found for tenant ${activeTenantId}.`);
    }

    return lead.brief;
  }
}
