import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineStatus } from "@prisma/client";
import { LeadScoringService } from "@/lib/leads/scoring/scoring.service";
import { getTenantPrisma } from "@/lib/prisma";
import { aiEngine } from "@/lib/ai/engine";

vi.mock("@/lib/prisma", () => ({
  getTenantPrisma: vi.fn(),
}));

vi.mock("@/lib/ai/engine", () => ({
  aiEngine: {
    generateWithFallback: vi.fn(),
  },
}));

const findFirstMock = vi.fn();
const updateMock = vi.fn();

describe("LeadScoringService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantPrisma).mockReturnValue({
      lead: {
        findFirst: findFirstMock,
        update: updateMock,
      },
    } as unknown as ReturnType<typeof getTenantPrisma>);
  });

  it("Lead con websiteScore bajo -> score alto", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "lead-low-site-score",
      tenantId: "tenant-a",
      name: "Clinica Norte",
      companyName: "Clinica Norte SA",
      website: "https://clinicax.com",
      websiteScore: 2,
      technologies: ["wordpress"],
      estimatedCompanySize: "11-50",
      industry: "salud",
      category: "clinica",
      socialPresence: { instagram: "ok" },
      rating: 4.2,
      reviewsCount: 120,
      description: "Servicios médicos",
      designQuality: "outdated",
      pipelineStatus: PipelineStatus.ENRIQUECIDO,
      status: "NEW",
    });

    vi.mocked(aiEngine.generateWithFallback).mockResolvedValueOnce(
      JSON.stringify({
        score: 9,
        scoreReason: "Sitio anticuado con alto potencial comercial.",
        recommendedService: "web",
        urgency: "alta",
        estimatedBudget: "alto",
        bestTimeToCall: "mañana",
      }),
    );

    const result = await LeadScoringService.scoreLead("tenant-a", "lead-low-site-score");

    expect(result.status).toBe("scored");
    if (result.status === "scored") {
      expect(result.score).toBe(9);
      expect(result.recommendedService).toBe("web");
    }

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-low-site-score" },
        data: expect.objectContaining({
          score: 9,
          recommendedService: "web",
          pipelineStatus: PipelineStatus.SCORED,
        }),
      }),
    );
  });

  it("Lead con technologies completas -> score bajo", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "lead-tech-complete",
      tenantId: "tenant-a",
      name: "Tech Fast",
      companyName: "Tech Fast LLC",
      website: "https://techfast.io",
      websiteScore: 9,
      technologies: ["nextjs", "ga4", "crm", "chatbot"],
      estimatedCompanySize: "51-200",
      industry: "software",
      category: "saas",
      socialPresence: { linkedin: "strong", instagram: "active" },
      rating: 4.8,
      reviewsCount: 340,
      description: "Stack digital sólido",
      designQuality: "modern",
      pipelineStatus: PipelineStatus.ENRIQUECIDO,
      status: "NEW",
    });

    vi.mocked(aiEngine.generateWithFallback).mockResolvedValueOnce(
      JSON.stringify({
        score: 3,
        scoreReason: "Tiene stack y ejecución digital madura.",
        recommendedService: "ads",
        urgency: "baja",
        estimatedBudget: "medio",
        bestTimeToCall: "tarde",
      }),
    );

    const result = await LeadScoringService.scoreLead("tenant-a", "lead-tech-complete");

    expect(result.status).toBe("scored");
    if (result.status === "scored") {
      expect(result.score).toBe(3);
    }

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          score: 3,
          pipelineStatus: PipelineStatus.SCORED,
        }),
      }),
    );
  });

  it("OpenAI falla -> maneja error sin crashear", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "lead-openai-fail",
      tenantId: "tenant-a",
      name: "Comercio Sur",
      companyName: "Comercio Sur",
      website: "https://comerciosur.com",
      websiteScore: 4,
      technologies: [],
      estimatedCompanySize: "1-10",
      industry: "retail",
      category: "comercio",
      socialPresence: {},
      rating: 3.7,
      reviewsCount: 15,
      description: null,
      designQuality: "outdated",
      pipelineStatus: PipelineStatus.ENRIQUECIDO,
      status: "NEW",
    });

    vi.mocked(aiEngine.generateWithFallback).mockRejectedValueOnce(
      new Error("OpenAI unavailable"),
    );

    const result = await LeadScoringService.scoreLead("tenant-a", "lead-openai-fail");

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toContain("OpenAI unavailable");
    }
    expect(updateMock).not.toHaveBeenCalled();
  });
});
