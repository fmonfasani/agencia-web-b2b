import { Prisma, AuditEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logAuditEvent(params: {
  eventType: AuditEventType;
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditEvent.create({
    data: {
      eventType: params.eventType,
      userId: params.userId,
      tenantId: params.tenantId,
      ipAddress: params.ipAddress,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
