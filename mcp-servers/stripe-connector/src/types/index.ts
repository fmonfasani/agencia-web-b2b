/**
 * Shared types for the stripe-connector MCP server
 */

/** Standard response envelope for all tools */
export interface StandardResponse<T = unknown> {
  status: 'success' | 'error';
  data: T | null;
  error: string | null;
}

/** Subscription plans available */
export type Plan = 'starter' | 'pro' | 'enterprise';

/** Subscription status values */
export type SubscriptionStatus = 'active' | 'pending' | 'canceled' | 'past_due' | 'incomplete';

/** Create subscription result */
export interface CreateSubscriptionData {
  subscription_id: string;
  status: 'active' | 'pending';
}

/** Subscription status result */
export interface SubscriptionStatusData {
  subscription_id: string;
  status: SubscriptionStatus;
  plan: Plan;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

/** Cancel subscription result */
export interface CancelSubscriptionData {
  subscription_id: string;
  status: 'canceled';
  canceled_at: string;
}

/** Upgrade subscription result */
export interface UpgradeSubscriptionData {
  subscription_id: string;
  status: SubscriptionStatus;
  previous_plan: string;
  new_plan: Plan;
}

/** Webhook event types handled */
export type WebhookEventType =
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'customer.subscription.deleted';

/** Webhook processing result */
export interface WebhookProcessedData {
  processed: boolean;
  event_type: string;
  timestamp: string;
}

/** Plan to Stripe Price ID mapping */
export interface PlanConfig {
  [key: string]: string;
}
