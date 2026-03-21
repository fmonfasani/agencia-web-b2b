import { prisma, getTenantPrisma } from '@/lib/prisma';
import { getPaymentDetails, getMPSubscriptionDetails } from './mercadopago';
import { createBillingAlert } from '@/lib/billing/alerts';
import type { MPSubscriptionStatus, SubscriptionStatus } from './types';

// ─── STATUS MAPPING ──────────────────────────────────────────────────

const MP_TO_INTERNAL_STATUS: Record<string, SubscriptionStatus> = {
  authorized: 'ACTIVE',
  paused: 'PAUSED',
  cancelled: 'CANCELLED',
  pending: 'PENDING',
};

// ─── PAYMENT WEBHOOK HANDLER ─────────────────────────────────────────

export async function handlePaymentWebhook(data: { id: string }) {
  const paymentId = data.id;

  try {
    // 1. Fetch payment details from MercadoPago
    const payment = await getPaymentDetails(paymentId);

    // 2. Extract tenant/user from external_reference
    const externalRef = (payment as any).external_reference;
    let tenantId: string;

    try {
      const parsed = JSON.parse(externalRef);
      tenantId = parsed.tenantId;
    } catch {
      console.error('Invalid external_reference format:', externalRef);
      return;
    }

    const tPrisma = getTenantPrisma(tenantId);

    // 3. Find the subscription
    const subscription = await tPrisma.subscription.findFirst({
      where: {
        tenantId,
        mercadopagoSubscriptionId: (payment as any).preapproval_id || undefined,
      },
    });

    if (!subscription) {
      console.error('Subscription not found for payment:', paymentId);
      return;
    }

    // 4. Record payment event
    await tPrisma.paymentEvent.create({
      data: {
        subscriptionId: subscription.id,
        tenantId,
        mercadopagoPaymentId: paymentId,
        mercadopagoStatus: (payment as any).status || 'unknown',
        amount: (payment as any).transaction_amount || 0,
        currency: (payment as any).currency_id || 'ARS',
        paymentMethod: (payment as any).payment_method_id,
        paymentType: (payment as any).payment_type_id,
        paidAt: (payment as any).date_approved
          ? new Date((payment as any).date_approved)
          : null,
        rawWebhook: payment as any,
      },
    });

    // 5. Update subscription based on payment status
    if ((payment as any).status === 'approved') {
      const now = new Date();
      const nextPeriod = new Date(now);
      nextPeriod.setMonth(nextPeriod.getMonth() + 1);

      await tPrisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          mercadopagoStatus: 'authorized',
          lastPaymentDate: now,
          nextPaymentDate: nextPeriod,
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriod,
          failedPaymentCount: 0,
        },
      });

      console.log(`✅ Payment approved for subscription ${subscription.id}`);
    }

    if ((payment as any).status === 'rejected') {
      await tPrisma.subscription.update({
        where: { id: subscription.id },
        data: {
          failedPaymentCount: { increment: 1 },
        },
      });

      // Create billing alert for failed payment
      await createBillingAlert({
        tenantId,
        type: 'PAYMENT_FAILED',
        severity: 'WARNING',
        message: `Pago rechazado: ${(payment as any).status_detail}`,
        metadata: { paymentId, reason: (payment as any).status_detail },
      });

      console.log(`❌ Payment rejected for subscription ${subscription.id}`);
    }
  } catch (error) {
    console.error('Error handling payment webhook:', error);
    throw error;
  }
}

// ─── SUBSCRIPTION PREAPPROVAL WEBHOOK HANDLER ────────────────────────

export async function handleSubscriptionWebhook(data: { id: string }) {
  const mpSubscriptionId = data.id;

  try {
    // 1. Fetch subscription details from MercadoPago
    const mpSubscription = await getMPSubscriptionDetails(mpSubscriptionId);

    // 2. Extract tenant from external_reference
    const externalRef = mpSubscription.external_reference;
    let tenantId: string;

    try {
      const parsed = JSON.parse(externalRef);
      tenantId = parsed.tenantId;
    } catch {
      console.error('Invalid external_reference format:', externalRef);
      return;
    }

    const tPrisma = getTenantPrisma(tenantId);

    // 3. Find subscription in DB
    const subscription = await tPrisma.subscription.findFirst({
      where: {
        tenantId,
        mercadopagoSubscriptionId: mpSubscriptionId,
      },
    });

    if (!subscription) {
      console.error('Subscription not found:', mpSubscriptionId);
      return;
    }

    // 4. Map status
    const newStatus =
      MP_TO_INTERNAL_STATUS[mpSubscription.status] || 'PENDING';

    // 5. Update subscription
    await tPrisma.subscription.update({
      where: { id: subscription.id },
      data: {
        mercadopagoStatus: mpSubscription.status,
        status: newStatus,
        mercadopagoPayerId: mpSubscription.payer_id?.toString() || null,
      },
    });

    // 6. Create alerts for critical status changes
    if (mpSubscription.status === 'cancelled') {
      await createBillingAlert({
        tenantId,
        type: 'SUBSCRIPTION_CANCELLED',
        severity: 'CRITICAL',
        message: 'Suscripción cancelada desde MercadoPago',
        metadata: { subscriptionId: mpSubscriptionId },
      });
    }

    console.log(
      `📝 Subscription ${mpSubscriptionId} updated to ${newStatus}`
    );
  } catch (error) {
    console.error('Error handling subscription webhook:', error);
    throw error;
  }
}
