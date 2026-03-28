import { prisma, getTenantPrisma } from '@/lib/prisma';
import {
  createSubscriptionPreference,
  cancelMPSubscription,
} from './mercadopago';
import { createBillingAlert } from '@/lib/billing/alerts';
import type {
  CreateSubscriptionParams,
  CancelSubscriptionParams,
  ChangePlanParams,
  PlanLimitCheck,
} from './types';

export class SubscriptionService {
  /**
   * Create a new subscription for a tenant.
   * Returns checkout URL to redirect the user to MercadoPago.
   */
  static async createSubscription(params: CreateSubscriptionParams) {
    const { tenantId, userId, planCode, userEmail } = params;

    // 1. Get plan
    const plan = await prisma.plan.findUnique({
      where: { code: planCode },
    });

    if (!plan || !plan.active) {
      throw new Error('Plan no válido o inactivo');
    }

    // 2. Check for existing active subscription
    const tPrisma = getTenantPrisma(tenantId);
    const existingSubscription = await tPrisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    });

    if (existingSubscription) {
      throw new Error('Ya existe una suscripción activa. Cancelala primero o cambiá de plan.');
    }

    // 3. Create MercadoPago preapproval
    const mpPreference = await createSubscriptionPreference({
      email: userEmail,
      planName: plan.name,
      price: plan.priceARS,
      tenantId,
      userId,
    });

    // 4. Save subscription in DB
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await tPrisma.subscription.create({
      data: {
        tenantId,
        planId: plan.id,
        mercadopagoSubscriptionId: mpPreference.id,
        mercadopagoPayerId: null,
        mercadopagoStatus: 'pending',
        status: 'PENDING',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextPaymentDate: periodEnd,
      },
      include: {
        plan: true,
      },
    });

    return {
      subscription,
      checkoutUrl: mpPreference.init_point,
      sandboxUrl: mpPreference.sandbox_init_point,
    };
  }

  /**
   * Cancel a subscription. Can be immediate or at end of current period.
   */
  static async cancelSubscription(params: CancelSubscriptionParams) {
    const { tenantId, subscriptionId, cancelAtPeriodEnd = true } = params;

    const tPrisma = getTenantPrisma(tenantId);
    const subscription = await tPrisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
    });

    if (!subscription) {
      throw new Error('Suscripción no encontrada');
    }

    // Immediate cancellation
    if (!cancelAtPeriodEnd && subscription.mercadopagoSubscriptionId) {
      await cancelMPSubscription(subscription.mercadopagoSubscriptionId);

      return tPrisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          mercadopagoStatus: 'cancelled',
          cancelledAt: new Date(),
          cancelAtPeriodEnd: false,
        },
      });
    }

    // Cancel at end of billing period
    return tPrisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: true,
      },
    });
  }

  /**
   * Change plan (upgrade/downgrade).
   * MercadoPago doesn't support in-place amount changes on preapprovals,
   * so we cancel current subscription and return data for a new checkout.
   */
  static async changePlan(params: ChangePlanParams) {
    const { tenantId, subscriptionId, newPlanCode } = params;

    const tPrisma = getTenantPrisma(tenantId);

    // 1. Get current subscription
    const subscription = await tPrisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Suscripción no encontrada');
    }

    // 2. Get new plan
    const newPlan = await prisma.plan.findUnique({
      where: { code: newPlanCode },
    });

    if (!newPlan || !newPlan.active) {
      throw new Error('Plan no válido');
    }

    if (subscription.plan.id === newPlan.id) {
      throw new Error('Ya estás en este plan');
    }

    // 3. Determine upgrade or downgrade
    const isUpgrade = newPlan.priceARS > subscription.plan.priceARS;

    // 4. Cancel current subscription in MercadoPago
    if (subscription.mercadopagoSubscriptionId) {
      await cancelMPSubscription(subscription.mercadopagoSubscriptionId);
    }

    // 5. Mark current as cancelled
    await tPrisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        mercadopagoStatus: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    return {
      requiresNewCheckout: true,
      newPlan,
      isUpgrade,
      previousPlan: subscription.plan,
    };
  }

  /**
   * Get subscription status for a tenant (most recent).
   */
  static async getSubscriptionStatus(tenantId: string) {
    const tPrisma = getTenantPrisma(tenantId);

    const subscription = await tPrisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscription;
  }

  /**
   * Check current usage against plan limits.
   */
  static async checkPlanLimits(tenantId: string): Promise<PlanLimitCheck> {
    const tPrisma = getTenantPrisma(tenantId);

    const subscription = await tPrisma.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: { plan: true },
    });

    if (!subscription) {
      return { hasActivePlan: false, limits: null, usage: null, isWithinLimits: null };
    }

    // Get current usage counts
    const [agentCount, userCount, leadCount, dealCount] = await Promise.all([
      tPrisma.agent.count({ where: { active: true } }),
      tPrisma.membership.count({ where: { status: 'ACTIVE' } }),
      tPrisma.lead.count(),
      tPrisma.deal.count(),
    ]);

    const limits = {
      maxAgents: subscription.plan.maxAgents,
      maxUsers: subscription.plan.maxUsers,
      maxLeads: subscription.plan.maxLeads,
      maxDeals: subscription.plan.maxDeals,
    };

    const usage = {
      agents: agentCount,
      users: userCount,
      leads: leadCount,
      deals: dealCount,
    };

    return {
      hasActivePlan: true,
      limits,
      usage,
      isWithinLimits: {
        agents: agentCount <= limits.maxAgents,
        users: userCount <= limits.maxUsers,
        leads: leadCount <= limits.maxLeads,
        deals: dealCount <= limits.maxDeals,
      },
    };
  }
}
