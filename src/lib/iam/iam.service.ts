import { prisma, getTenantPrisma } from "@/lib/prisma";
import { AuditEventType, Role } from "@prisma/client";
import { canModifyRole } from "./rbac";

/**
 * Enterprise IAM Service
 * Handles user lifecycle, roles, and administrative actions.
 */
export const IAMService = {
  /**
   * Logical delete of a user within a Tenant
   */
  async deleteMembership(
    actorId: string,
    tenantId: string,
    membershipId: string,
  ) {
    const tPrisma = getTenantPrisma(tenantId);
    const actor = await this.getMembership(actorId, tenantId);
    const target = await tPrisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!target)
      throw new Error("Membership not found");
    if (!canModifyRole(actor.role as Role, target.role as Role)) {
      throw new Error("Insufficient privileges to delete this user");
    }

    return await tPrisma.membership.update({
      where: { id: membershipId },
      data: {
        status: "DELETED",
        // Logic to track when the relation was broken
      },
    });
  },

  /**
   * Block/Deactivate a user membership
   */
  async updateMembershipStatus(
    actorId: string,
    tenantId: string,
    membershipId: string,
    newStatus: "ACTIVE" | "INACTIVE" | "BLOCKED",
  ) {
    const tPrisma = getTenantPrisma(tenantId);
    const actor = await this.getMembership(actorId, tenantId);
    const target = await tPrisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!target) throw new Error("Membership not found");
    if (!canModifyRole(actor.role as Role, target.role as Role)) {
      throw new Error("Cannot modify status of higher or equal role");
    }

    const result = await tPrisma.membership.update({
      where: { id: membershipId },
      data: { status: newStatus },
    });

    // Auditoría
    await this.logAudit(
      actorId,
      target.userId,
      tenantId,
      `STATUS_CHANGE_${newStatus}`,
    );

    return result;
  },

  /**
   * Audit Logging helper
   */
  async logAudit(
    actorId: string,
    targetId: string | null,
    tenantId: string,
    action: string,
    metadata: Record<string, unknown> = {},
  ) {
    const tPrisma = getTenantPrisma(tenantId);
    return await tPrisma.auditEvent.create({
      data: {
        eventType: AuditEventType.ADMIN_ACTION,
        userId: actorId, // Who did it
        tenantId, // Explicitly included for schema compliance
        metadata: {
          action,
          targetUserId: targetId,
          ...metadata,
        },
      },
    });
  },

  /**
   * Helper to get validated actor membership
   */
  async getMembership(userId: string, tenantId: string) {
    const tPrisma = getTenantPrisma(tenantId);
    const m = await tPrisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!m) throw new Error("Unauthorized: No membership in this tenant");
    return m;
  },
};
