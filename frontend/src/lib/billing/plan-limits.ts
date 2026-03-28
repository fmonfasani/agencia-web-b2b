import { SubscriptionService } from '@/lib/payments/subscription-service';

/**
 * Custom error for plan limit violations.
 */
export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

/**
 * Asserts that a tenant has not exceeded a specific plan limit.
 * Throws PlanLimitError if the limit is reached.
 *
 * @example
 * ```ts
 * const agentCount = await prisma.agent.count({ where: { tenantId, active: true } });
 * await assertPlanLimit(tenantId, 'maxAgents', agentCount);
 * ```
 */
export async function assertPlanLimit(
  tenantId: string,
  resource: 'maxAgents' | 'maxUsers' | 'maxLeads' | 'maxDeals',
  currentCount: number
) {
  const status = await SubscriptionService.checkPlanLimits(tenantId);

  if (!status.hasActivePlan) {
    throw new PlanLimitError(
      'No tenés un plan activo. Suscribite para continuar.'
    );
  }

  const limit = status.limits![resource];

  if (currentCount >= limit) {
    const resourceNames: Record<string, string> = {
      maxAgents: 'agentes',
      maxUsers: 'usuarios',
      maxLeads: 'leads',
      maxDeals: 'deals',
    };

    throw new PlanLimitError(
      `Alcanzaste el límite de ${resourceNames[resource]} de tu plan (${limit}). Hacé upgrade para continuar.`
    );
  }
}
