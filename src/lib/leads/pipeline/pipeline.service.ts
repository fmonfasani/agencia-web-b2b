import { PipelineStatus, Prisma } from "@prisma/client";
import { getTenantPrisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";

const LINEAR_FLOW: PipelineStatus[] = [
  PipelineStatus.NUEVO,
  PipelineStatus.ENRIQUECIDO,
  PipelineStatus.SCORED,
  PipelineStatus.INVESTIGADO,
  PipelineStatus.CITADO,
  PipelineStatus.LLAMADO,
  PipelineStatus.PROPUESTA_ENVIADA,
];

const TERMINAL_FLOW: PipelineStatus[] = [
  PipelineStatus.CERRADO_GANADO,
  PipelineStatus.CERRADO_PERDIDO,
  PipelineStatus.DESCARTADO,
];

const VALID_TRANSITIONS: Record<PipelineStatus, PipelineStatus[]> = {
  NUEVO: [PipelineStatus.ENRIQUECIDO, PipelineStatus.DESCARTADO],
  ENRIQUECIDO: [PipelineStatus.SCORED, PipelineStatus.DESCARTADO],
  SCORED: [PipelineStatus.INVESTIGADO, PipelineStatus.DESCARTADO],
  INVESTIGADO: [PipelineStatus.CITADO, PipelineStatus.DESCARTADO],
  CITADO: [PipelineStatus.LLAMADO, PipelineStatus.DESCARTADO],
  LLAMADO: [PipelineStatus.PROPUESTA_ENVIADA, PipelineStatus.DESCARTADO],
  PROPUESTA_ENVIADA: [
    PipelineStatus.CERRADO_GANADO,
    PipelineStatus.CERRADO_PERDIDO,
    PipelineStatus.DESCARTADO,
  ],
  CERRADO_GANADO: [PipelineStatus.DESCARTADO],
  CERRADO_PERDIDO: [PipelineStatus.DESCARTADO],
  DESCARTADO: [],
};

type JsonRecord = Record<string, unknown>;

function asJsonRecord(value: Prisma.JsonValue | null): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function buildTransitionMetadata(
  rawMetadata: Prisma.JsonValue | null,
  oldStatus: PipelineStatus,
  newStatus: PipelineStatus,
  metadata?: JsonRecord,
): Prisma.InputJsonValue {
  const current = asJsonRecord(rawMetadata);
  const currentTransitions = Array.isArray(current.pipelineTransitions)
    ? current.pipelineTransitions
    : [];

  const transitionEntry: JsonRecord = {
    from: oldStatus,
    to: newStatus,
    changedAt: new Date().toISOString(),
    ...metadata,
  };

  return {
    ...current,
    pipelineTransitions: [...currentTransitions, transitionEntry],
  };
}

function assertValidTransition(
  current: PipelineStatus,
  next: PipelineStatus,
): void {
  if (current === next) return;

  const allowed = VALID_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(
      `Invalid pipeline transition from ${current} to ${next}. Allowed: ${allowed.join(", ") || "none"}.`,
    );
  }
}

function isPipelineStatus(value: string): value is PipelineStatus {
  return Object.values(PipelineStatus).includes(value as PipelineStatus);
}

export interface PipelineStats {
  total: number;
  byStatus: Record<PipelineStatus, number>;
  active: number;
}

export const LeadPipelineService = {
  isPipelineStatus,

  async advancePipeline(
    tenantId: string,
    leadId: string,
    newStatus: PipelineStatus,
    metadata?: JsonRecord,
  ) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);

    const lead = await tPrisma.lead.findFirst({
      where: { id: leadId },
      select: {
        id: true,
        pipelineStatus: true,
        rawMetadata: true,
      },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found for tenant ${activeTenantId}.`);
    }

    assertValidTransition(lead.pipelineStatus, newStatus);

    const mergedMetadata = buildTransitionMetadata(
      lead.rawMetadata,
      lead.pipelineStatus,
      newStatus,
      metadata,
    );

    return tPrisma.lead.update({
      where: { id: leadId },
      data: {
        pipelineStatus: newStatus,
        rawMetadata: mergedMetadata,
      },
    });
  },

  async getPipelineStats(tenantId: string): Promise<PipelineStats> {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);

    const grouped = await tPrisma.lead.groupBy({
      by: ["pipelineStatus"],
      _count: { _all: true },
    });

    const byStatus = Object.values(PipelineStatus).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<PipelineStatus, number>,
    );

    for (const row of grouped as Array<{ pipelineStatus: PipelineStatus; _count: { _all: number } }>) {
      byStatus[row.pipelineStatus] = row._count._all;
    }

    const total = Object.values(byStatus).reduce(
      (sum, count) => sum + count,
      0,
    );
    const closedSiblingStatuses = [
      PipelineStatus.CERRADO_PERDIDO,
      PipelineStatus.DESCARTADO,
    ];
    const active = Object.values(PipelineStatus).reduce(
      (sum, status) =>
        closedSiblingStatuses.includes(status) ? sum : sum + byStatus[status],
      0,
    );

    return { total, byStatus, active };
  },

  async getLeadsByStatus(tenantId: string, status: PipelineStatus, limit = 50) {
    const activeTenantId = requireTenantId(tenantId);
    const tPrisma = getTenantPrisma(activeTenantId);
    const safeLimit = Math.max(1, Math.min(limit, 200));

    return tPrisma.lead.findMany({
      where: { pipelineStatus: status },
      include: {
        intelligence: true,
      },
      orderBy: { updatedAt: "desc" },
      take: safeLimit,
    });
  },
};
