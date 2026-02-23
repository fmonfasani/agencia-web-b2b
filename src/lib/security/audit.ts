import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "TENANT_SWITCH"
  | "ADMIN_ACTION"
  | "PASSWORD_CHANGED"
  | "INVITATION_SENT"
  | "INVITATION_ACCEPTED";

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
