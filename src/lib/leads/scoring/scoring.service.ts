import { PipelineStatus } from "@prisma/client";
import { aiEngine } from "@/lib/ai/engine";
import { getTenantPrisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import { SCORING_PROMPT } from "./scoring.prompts";

type RecommendedService = "web" | "marketing" | "ads" | "combo";
type Urgency = "alta" | "media" | "baja";
type EstimatedBudget = "bajo" | "medio" | "alto";
type BestTimeToCall = "mañana" | "tarde" | "indiferente";

interface ScoringResponse {
  score: number;
  scoreReason: string;
  recommendedService: RecommendedService;
  urgency: Urgency;
  estimatedBudget: EstimatedBudget;
  bestTimeToCall: BestTimeToCall;
}

export interface LeadScoringSuccess {
  leadId: string;
  status: "scored";
  score: number;
  recommendedService: RecommendedService;
}

export interface LeadScoringFailure {
  leadId: string;
  status: "failed";
  error: string;
}

export type LeadScoringResult = LeadScoringSuccess | LeadScoringFailure;

export interface BatchScoringResult {
  processed: number;
  scored: number;
  failed: number;
  results: LeadScoringResult[];
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

function parseScoringResponse(raw: string): ScoringResponse {
  const parsed = parseJsonObject(raw);
  const scoreValue = parsed.score;

  if (typeof scoreValue !== "number" || !Number.isFinite(scoreValue)) {
    throw new Error("Invalid score value from AI.");
  }

  const score = Math.max(1, Math.min(10, Math.round(scoreValue)));
  const scoreReason = typeof parsed.scoreReason === "string" ? parsed.scoreReason.trim() : "";
  const recommendedService = parsed.recommendedService;
  const urgency = parsed.urgency;
  const estimatedBudget = parsed.estimatedBudget;
  const bestTimeToCall = parsed.bestTimeToCall;

  const allowedServices: RecommendedService[] = ["web", "marketing", "ads", "combo"];
  const allowedUrgency: Urgency[] = ["alta", "media", "baja"];
  const allowedBudget: EstimatedBudget[] = ["bajo", "medio", "alto"];
  const allowedTime: BestTimeToCall[] = ["mañana", "tarde", "indiferente"];

  if (!scoreReason) {
    throw new Error("Invalid scoreReason value from AI.");
  }
  if (typeof recommendedService !== "string" || !allowedServices.includes(recommendedService as RecommendedService)) {
    throw new Error("Invalid recommendedService value from AI.");
  }
  if (typeof urgency !== "string" || !allowedUrgency.includes(urgency as Urgency)) {
    throw new Error("Invalid urgency value from AI.");
  }
  if (typeof estimatedBudget !== "string" || !allowedBudget.includes(estimatedBudget as EstimatedBudget)) {
    throw new Error("Invalid estimatedBudget value from AI.");
  }
  if (typeof bestTimeToCall !== "string" || !allowedTime.includes(bestTimeToCall as BestTimeToCall)) {
    throw new Error("Invalid bestTimeToCall value from AI.");
  }

  return {
    score,
    scoreReason,
    recommendedService: recommendedService as RecommendedService,
    urgency: urgency as Urgency,
    estimatedBudget: estimatedBudget as EstimatedBudget,
    bestTimeToCall: bestTimeToCall as BestTimeToCall,
  };
}

export class LeadScoringService {
  static async scoreLead(tenantId: string, leadId: string): Promise<LeadScoringResult> {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);

    const lead = await tPrisma.lead.findFirst({
      where: { id: leadId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        companyName: true,
        website: true,
        websiteScore: true,
        technologies: true,
        estimatedCompanySize: true,
        industry: true,
        category: true,
        socialPresence: true,
        rating: true,
        reviewsCount: true,
        description: true,
        designQuality: true,
        pipelineStatus: true,
        status: true,
      },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found for tenant ${activeTenantId}.`);
    }

    if (lead.pipelineStatus !== PipelineStatus.ENRIQUECIDO) {
      throw new Error(
        `Lead ${leadId} must be in ENRIQUECIDO status to be scored. Current status: ${lead.pipelineStatus}.`,
      );
    }

    const leadData = {
      id: lead.id,
      name: lead.name,
      companyName: lead.companyName,
      website: lead.website,
      websiteScore: lead.websiteScore,
      technologies: lead.technologies,
      companySize: lead.estimatedCompanySize,
      industry: lead.industry ?? lead.category,
      socialPresence: lead.socialPresence,
      rating: lead.rating,
      reviewsCount: lead.reviewsCount,
      description: lead.description,
      designQuality: lead.designQuality,
      status: lead.status,
      pipelineStatus: lead.pipelineStatus,
    };

    const prompt = SCORING_PROMPT.replace("{LEAD_DATA}", JSON.stringify(leadData, null, 2));

    let aiScoring: ScoringResponse;
    try {
      const aiResponse = await aiEngine.generateWithFallback(
        [
          {
            role: "system",
            content: "You are a B2B lead scoring assistant. You only output valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        activeTenantId,
      );
      aiScoring = parseScoringResponse(aiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown AI scoring error";
      return {
        leadId,
        status: "failed",
        error: message,
      };
    }

    await tPrisma.lead.update({
      where: { id: leadId },
      data: {
        score: aiScoring.score,
        scoreReason: aiScoring.scoreReason,
        recommendedService: aiScoring.recommendedService,
        urgency: aiScoring.urgency,
        estimatedBudget: aiScoring.estimatedBudget,
        bestTimeToCall: aiScoring.bestTimeToCall,
        potentialScore: aiScoring.score * 10,
        pipelineStatus: PipelineStatus.SCORED,
      },
    });

    return {
      leadId,
      status: "scored",
      score: aiScoring.score,
      recommendedService: aiScoring.recommendedService,
    };
  }

  static async scoreBatch(tenantId: string, limit = 10): Promise<BatchScoringResult> {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const leads = await tPrisma.lead.findMany({
      where: { pipelineStatus: PipelineStatus.ENRIQUECIDO },
      take: safeLimit,
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const results: LeadScoringResult[] = [];
    for (const lead of leads) {
      const result = await this.scoreLead(activeTenantId, lead.id);
      results.push(result);
    }

    const scored = results.filter((result) => result.status === "scored").length;
    return {
      processed: results.length,
      scored,
      failed: results.length - scored,
      results,
    };
  }
}
