import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineStatus } from "@prisma/client";
import { LeadBriefService } from "@/lib/leads/brief/brief.service";
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
const findManyMock = vi.fn();
const updateMock = vi.fn();

describe("LeadBriefService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FIRECRAWL_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());

    vi.mocked(getTenantPrisma).mockReturnValue({
      lead: {
        findFirst: findFirstMock,
        findMany: findManyMock,
        update: updateMock,
      },
    } as unknown as ReturnType<typeof getTenantPrisma>);
  });

  it("Lead con score >= 7 genera brief completo", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "lead-brief-ok",
      name: "Clínica Delta",
      companyName: "Clínica Delta",
      score: 8,
      scoreReason: "Alta oportunidad",
      recommendedService: "web",
      website: "https://clinicadelta.com",
      industry: "salud",
      category: "clinica",
      description: "Servicios de salud",
      technologies: ["wordpress"],
      websiteScore: 4,
      socialPresence: { instagram: true },
      designQuality: "outdated",
      estimatedCompanySize: "11-50",
      pipelineStatus: PipelineStatus.SCORED,
      address: "CABA",
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { title: "Competidor 1", url: "https://comp1.com", description: "Resumen 1" },
          { title: "Competidor 2", url: "https://comp2.com", description: "Resumen 2" },
          { title: "Competidor 3", url: "https://comp3.com", description: "Resumen 3" },
        ],
      }),
    } as Response);

    vi.mocked(aiEngine.generateWithFallback).mockResolvedValueOnce(
      `## BRIEF: Clínica Delta
**Score:** 8/10
**Servicio recomendado:** web

**Qué hace la empresa:**
Brinda servicios médicos.

**Su problema principal visible:**
Sitio desactualizado.

**Por qué nos necesitan:**
Perdida de conversiones.

**Cómo están sus competidores:**
- Competidor 1: Más moderno.
- Competidor 2: Mejor SEO.
- Competidor 3: Mejor captación.

**Opener sugerido:**
Vi una oportunidad clara en su web actual.

**Preguntas clave:**
1. ¿Cómo convierten hoy?
2. ¿Cuál es su presupuesto?
3. ¿Cuándo quieren empezar?

**Señales de compra a buscar:**
Interés en resultados rápidos.`,
    );

    const result = await LeadBriefService.generateBrief("tenant-a", "lead-brief-ok");

    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.brief).toContain("## BRIEF: Clínica Delta");
      expect(result.competitors.length).toBe(3);
    }
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-brief-ok" },
        data: expect.objectContaining({
          pipelineStatus: PipelineStatus.INVESTIGADO,
        }),
      }),
    );
  });

  it("Lead con score < 7 skip, no genera", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "lead-brief-skip",
      name: "Lead Bajo",
      companyName: "Lead Bajo",
      score: 6,
      scoreReason: "Baja oportunidad",
      recommendedService: "ads",
      website: "https://low.com",
      industry: "retail",
      category: "tienda",
      description: "Tienda local",
      technologies: [],
      websiteScore: 8,
      socialPresence: {},
      designQuality: "modern",
      estimatedCompanySize: "1-10",
      pipelineStatus: PipelineStatus.SCORED,
      address: "CABA",
    });

    const result = await LeadBriefService.generateBrief("tenant-a", "lead-brief-skip");

    expect(result.status).toBe("skipped");
    expect(aiEngine.generateWithFallback).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("Competidores no encontrados genera brief sin esa sección", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "lead-no-competitors",
      name: "Panadería Norte",
      companyName: "Panadería Norte",
      score: 7,
      scoreReason: "Oportunidad media-alta",
      recommendedService: "marketing",
      website: "https://panaderianorte.com",
      industry: "gastronomia",
      category: "panaderia",
      description: "Panificados",
      technologies: ["shopify"],
      websiteScore: 5,
      socialPresence: { instagram: true },
      designQuality: "outdated",
      estimatedCompanySize: "11-50",
      pipelineStatus: PipelineStatus.SCORED,
      address: "CABA",
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    vi.mocked(aiEngine.generateWithFallback).mockResolvedValueOnce(
      `## BRIEF: Panadería Norte
**Score:** 7/10
**Servicio recomendado:** marketing

**Qué hace la empresa:**
Venta minorista.

**Su problema principal visible:**
Poca captación online.

**Por qué nos necesitan:**
Necesitan adquisición digital.

**Cómo están sus competidores:**
- Competidor 1: N/A.
- Competidor 2: N/A.
- Competidor 3: N/A.

**Opener sugerido:**
Tenemos una mejora rápida para su captación.

**Preguntas clave:**
1. ¿Cómo captan hoy?
2. ¿Qué presupuesto manejan?
3. ¿Quién decide la inversión?

**Señales de compra a buscar:**
Interés en resultados medibles.`,
    );

    const result = await LeadBriefService.generateBrief("tenant-a", "lead-no-competitors");

    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.competitors).toHaveLength(0);
      expect(result.brief).not.toContain("**Cómo están sus competidores:**");
    }
    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});
