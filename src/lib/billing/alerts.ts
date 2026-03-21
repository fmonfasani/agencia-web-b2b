import { getTenantPrisma } from '@/lib/prisma';
import type { BillingAlertParams } from '@/lib/payments/types';

/**
 * Create a new billing alert for a tenant.
 */
export async function createBillingAlert(params: BillingAlertParams) {
  const tPrisma = getTenantPrisma(params.tenantId);

  return tPrisma.billingAlert.create({
    data: {
      tenantId: params.tenantId,
      type: params.type,
      severity: params.severity,
      message: params.message,
      metadata: params.metadata || {},
    },
  });
}

/**
 * Get all unresolved billing alerts for a tenant, newest first.
 */
export async function getUnresolvedAlerts(tenantId: string) {
  const tPrisma = getTenantPrisma(tenantId);

  return tPrisma.billingAlert.findMany({
    where: { tenantId, resolved: false },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Resolve a billing alert.
 */
export async function resolveAlert(tenantId: string, alertId: string) {
  const tPrisma = getTenantPrisma(tenantId);

  return tPrisma.billingAlert.update({
    where: { id: alertId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  });
}
