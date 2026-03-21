/**
 * Types for the MercadoPago billing system
 */

export type PlanCode = 'STARTER' | 'PRO' | 'ENTERPRISE';

export type SubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'PAUSED';

export type MPSubscriptionStatus =
  | 'authorized'
  | 'paused'
  | 'cancelled'
  | 'pending';

export type MPPaymentStatus =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'refunded'
  | 'in_process';

export type WebhookEventType =
  | 'payment'
  | 'subscription_preapproval'
  | 'plan';

export interface CreateSubscriptionParams {
  tenantId: string;
  userId: string;
  planCode: string;
  userEmail: string;
}

export interface CancelSubscriptionParams {
  tenantId: string;
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
}

export interface ChangePlanParams {
  tenantId: string;
  subscriptionId: string;
  newPlanCode: string;
}

export interface PlanLimits {
  maxAgents: number;
  maxUsers: number;
  maxLeads: number;
  maxDeals: number;
}

export interface PlanUsage {
  agents: number;
  users: number;
  leads: number;
  deals: number;
}

export interface PlanLimitCheck {
  hasActivePlan: boolean;
  limits: PlanLimits | null;
  usage: PlanUsage | null;
  isWithinLimits: Record<string, boolean> | null;
}

export interface MPPreapprovalResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  status: string;
  payer_id?: string;
  external_reference?: string;
  [key: string]: unknown;
}

export interface BillingAlertParams {
  tenantId: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  metadata?: Record<string, unknown>;
}
