import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineStatus } from "@prisma/client";
import { LeadPipelineService } from "@/lib/leads/pipeline/pipeline.service";
import { getTenantPrisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  getTenantPrisma: vi.fn(),
}));

const findFirstMock = vi.fn();
const updateMock = vi.fn();
const groupByMock = vi.fn();
const findManyMock = vi.fn();

describe("LeadPipelineService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantPrisma).mockReturnValue({
      lead: {
        findFirst: findFirstMock,
        update: updateMock,
        groupBy: groupByMock,
        findMany: findManyMock,
      },
    } as unknown as ReturnType<typeof getTenantPrisma>);
  });

  it("Transición válida actualiza correctamente", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "lead-1",
      pipelineStatus: PipelineStatus.SCORED,
      rawMetadata: {},
    });
    updateMock.mockResolvedValueOnce({
      id: "lead-1",
      pipelineStatus: PipelineStatus.INVESTIGADO,
    });

    const result = await LeadPipelineService.advancePipeline(
      "tenant-a",
      "lead-1",
      PipelineStatus.INVESTIGADO,
      { notes: "apto para investigación" },
    );

    expect(result.pipelineStatus).toBe(PipelineStatus.INVESTIGADO);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-1" },
        data: expect.objectContaining({
          pipelineStatus: PipelineStatus.INVESTIGADO,
          rawMetadata: expect.objectContaining({
            pipelineTransitions: expect.arrayContaining([
              expect.objectContaining({
                from: PipelineStatus.SCORED,
                to: PipelineStatus.INVESTIGADO,
                notes: "apto para investigación",
              }),
            ]),
          }),
        }),
      }),
    );
  });

  it("Transición inválida lanza error", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "lead-2",
      pipelineStatus: PipelineStatus.NUEVO,
      rawMetadata: null,
    });

    await expect(
      LeadPipelineService.advancePipeline(
        "tenant-a",
        "lead-2",
        PipelineStatus.LLAMADO,
      ),
    ).rejects.toThrow("Invalid pipeline transition from NUEVO to LLAMADO");

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("Stats retornan conteo correcto", async () => {
    groupByMock.mockResolvedValueOnce([
      { pipelineStatus: PipelineStatus.NUEVO, _count: { _all: 2 } },
      { pipelineStatus: PipelineStatus.SCORED, _count: { _all: 3 } },
      { pipelineStatus: PipelineStatus.CERRADO_GANADO, _count: { _all: 1 } },
      { pipelineStatus: PipelineStatus.DESCARTADO, _count: { _all: 4 } },
    ]);

    const stats = await LeadPipelineService.getPipelineStats("tenant-a");

    expect(stats.total).toBe(10);
    expect(stats.byStatus.NUEVO).toBe(2);
    expect(stats.byStatus.SCORED).toBe(3);
    expect(stats.byStatus.CERRADO_GANADO).toBe(1);
    expect(stats.byStatus.DESCARTADO).toBe(4);
    expect(stats.active).toBe(6);
  });
});
