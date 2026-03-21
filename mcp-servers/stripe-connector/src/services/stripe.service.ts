import Stripe from 'stripe';
import { toolLogger } from '../middleware/logger.js';
import {
  makeIdempotencyKey,
  getCachedResult,
  setCachedResult,
} from '../middleware/idempotency.js';
import type {
  StandardResponse,
  Plan,
  CreateSubscriptionData,
  CancelSubscriptionData,
  UpgradeSubscriptionData,
  SubscriptionStatusData,
  WebhookEventType,
  WebhookProcessedData,
} from '../types/index.js';

const log = toolLogger('StripeService');

/**
 * Plan name → Stripe Price ID mapping.
 * These should be configured via environment variables.
 */
function getPlanPriceIds(): Record<Plan, string> {
  return {
    starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder',
    pro: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_placeholder',
  };
}

/**
 * Reverse lookup: Stripe Price ID → Plan name
 */
function getPlanFromPriceId(priceId: string): Plan | 'unknown' {
  const priceIds = getPlanPriceIds();
  for (const [plan, id] of Object.entries(priceIds)) {
    if (id === priceId) return plan as Plan;
  }
  return 'unknown';
}

/**
 * StripeService encapsulates all interactions with the Stripe API.
 * MCP tools NEVER call Stripe directly — they always go through this service.
 */
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(secretKey);

    log.info('StripeService initialized');
  }

  // ─── CREATE SUBSCRIPTION ─────────────────────────────────────────────

  async createSubscription(
    customerId: string,
    plan: Plan
  ): Promise<StandardResponse<CreateSubscriptionData>> {
    const idempotencyKey = makeIdempotencyKey('create', customerId, plan);

    // Check idempotency cache
    const cached = getCachedResult<StandardResponse<CreateSubscriptionData>>(idempotencyKey);
    if (cached) return cached;

    try {
      log.info(`Creating subscription for customer=${customerId}, plan=${plan}`);
      const priceIds = getPlanPriceIds();
      const priceId = priceIds[plan];

      if (!priceId || priceId.includes('placeholder')) {
        return this.errorResponse(`Price ID not configured for plan: ${plan}`);
      }

      const subscription = await this.stripe.subscriptions.create(
        {
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        },
        {
          idempotencyKey,
        }
      );

      const result: StandardResponse<CreateSubscriptionData> = {
        status: 'success',
        data: {
          subscription_id: subscription.id,
          status: subscription.status === 'active' ? 'active' : 'pending',
        },
        error: null,
      };

      setCachedResult(idempotencyKey, result);
      log.info(`Subscription created: ${subscription.id} (status: ${subscription.status})`);
      return result;
    } catch (err) {
      return this.handleError('createSubscription', err);
    }
  }

  // ─── CANCEL SUBSCRIPTION ─────────────────────────────────────────────

  async cancelSubscription(
    subscriptionId: string
  ): Promise<StandardResponse<CancelSubscriptionData>> {
    try {
      log.info(`Canceling subscription: ${subscriptionId}`);

      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);

      const result: StandardResponse<CancelSubscriptionData> = {
        status: 'success',
        data: {
          subscription_id: subscription.id,
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        },
        error: null,
      };

      log.info(`Subscription canceled: ${subscription.id}`);
      return result;
    } catch (err) {
      return this.handleError('cancelSubscription', err);
    }
  }

  // ─── UPGRADE SUBSCRIPTION ────────────────────────────────────────────

  async upgradeSubscription(
    subscriptionId: string,
    newPlan: Plan
  ): Promise<StandardResponse<UpgradeSubscriptionData>> {
    const idempotencyKey = makeIdempotencyKey('upgrade', subscriptionId, newPlan);

    const cached = getCachedResult<StandardResponse<UpgradeSubscriptionData>>(idempotencyKey);
    if (cached) return cached;

    try {
      log.info(`Upgrading subscription ${subscriptionId} to plan=${newPlan}`);
      const priceIds = getPlanPriceIds();
      const newPriceId = priceIds[newPlan];

      if (!newPriceId || newPriceId.includes('placeholder')) {
        return this.errorResponse(`Price ID not configured for plan: ${newPlan}`);
      }

      // Fetch current subscription to get the item ID and current plan
      const current = await this.stripe.subscriptions.retrieve(subscriptionId);
      const currentItem = current.items.data[0];
      if (!currentItem) {
        return this.errorResponse('Subscription has no items');
      }

      const previousPlan = getPlanFromPriceId(
        typeof currentItem.price === 'string' ? currentItem.price : currentItem.price.id
      );

      const updated = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          items: [
            { id: currentItem.id, price: newPriceId },
          ],
          proration_behavior: 'create_prorations',
        },
        { idempotencyKey }
      );

      const result: StandardResponse<UpgradeSubscriptionData> = {
        status: 'success',
        data: {
          subscription_id: updated.id,
          status: updated.status as UpgradeSubscriptionData['status'],
          previous_plan: previousPlan,
          new_plan: newPlan,
        },
        error: null,
      };

      setCachedResult(idempotencyKey, result);
      log.info(`Subscription upgraded: ${updated.id} (${previousPlan} → ${newPlan})`);
      return result;
    } catch (err) {
      return this.handleError('upgradeSubscription', err);
    }
  }

  // ─── GET SUBSCRIPTION STATUS ─────────────────────────────────────────

  async getSubscriptionStatus(
    subscriptionId: string
  ): Promise<StandardResponse<SubscriptionStatusData>> {
    try {
      log.info(`Fetching status for subscription: ${subscriptionId}`);

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });

      const item = subscription.items.data[0];
      const priceId = item
        ? typeof item.price === 'string'
          ? item.price
          : item.price.id
        : 'unknown';

      const plan = getPlanFromPriceId(priceId);

      const result: StandardResponse<SubscriptionStatusData> = {
        status: 'success',
        data: {
          subscription_id: subscription.id,
          status: subscription.status as SubscriptionStatusData['status'],
          plan: plan === 'unknown' ? 'starter' : plan,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        },
        error: null,
      };

      log.info(`Subscription ${subscription.id}: status=${subscription.status}, plan=${plan}`);
      return result;
    } catch (err) {
      return this.handleError('getSubscriptionStatus', err);
    }
  }

  // ─── HANDLE WEBHOOK ──────────────────────────────────────────────────

  async handleWebhookEvent(
    eventType: WebhookEventType,
    payload: Record<string, unknown>,
    signature?: string
  ): Promise<StandardResponse<WebhookProcessedData>> {
    try {
      log.info(`Processing webhook event: ${eventType}`);

      // Verify webhook signature if provided
      if (signature && process.env.STRIPE_WEBHOOK_SECRET) {
        try {
          const rawBody = JSON.stringify(payload);
          this.stripe.webhooks.constructEvent(
            rawBody,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
          );
          log.info('Webhook signature verified');
        } catch (sigErr) {
          log.error('Webhook signature verification failed', { error: sigErr });
          return this.errorResponse('Webhook signature verification failed');
        }
      }

      // Process event based on type
      switch (eventType) {
        case 'invoice.paid':
          log.info('Invoice paid', {
            invoice_id: payload.id,
            customer: payload.customer,
          });
          // Business logic: activate subscription, send confirmation email, etc.
          break;

        case 'invoice.payment_failed':
          log.warn('Invoice payment failed', {
            invoice_id: payload.id,
            customer: payload.customer,
          });
          // Business logic: notify customer, retry logic, etc.
          break;

        case 'customer.subscription.deleted':
          log.info('Subscription deleted', {
            subscription_id: payload.id,
            customer: payload.customer,
          });
          // Business logic: revoke access, send cancellation email, etc.
          break;

        default:
          log.warn(`Unhandled webhook event type: ${eventType}`);
      }

      const result: StandardResponse<WebhookProcessedData> = {
        status: 'success',
        data: {
          processed: true,
          event_type: eventType,
          timestamp: new Date().toISOString(),
        },
        error: null,
      };

      return result;
    } catch (err) {
      return this.handleError('handleWebhookEvent', err);
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────

  private errorResponse<T>(message: string): StandardResponse<T> {
    log.error(message);
    return {
      status: 'error',
      data: null,
      error: message,
    };
  }

  private handleError<T>(operation: string, err: unknown): StandardResponse<T> {
    const message =
      err instanceof Stripe.errors.StripeError
        ? `Stripe error in ${operation}: ${err.message} (type: ${err.type})`
        : err instanceof Error
          ? `Error in ${operation}: ${err.message}`
          : `Unknown error in ${operation}`;

    log.error(message, { operation, error: err });

    return {
      status: 'error',
      data: null,
      error: message,
    };
  }
}
