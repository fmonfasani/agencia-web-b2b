import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';
import type { MPPreapprovalResponse } from './types';

// ─── SINGLETON CLIENT ────────────────────────────────────────────────

let mpClient: MercadoPagoConfig | null = null;

export function getMercadoPagoClient(): MercadoPagoConfig {
  if (!mpClient) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');
    }
    mpClient = new MercadoPagoConfig({ accessToken });
  }
  return mpClient;
}

// ─── SUBSCRIPTION (PREAPPROVAL) OPERATIONS ───────────────────────────

/**
 * Creates a MercadoPago preapproval (recurring subscription).
 */
export async function createSubscriptionPreference(params: {
  email: string;
  planName: string;
  price: number;
  tenantId: string;
  userId: string;
}): Promise<MPPreapprovalResponse> {
  const response = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: `Suscripción ${params.planName} - Agencia B2B`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: params.price,
        currency_id: 'ARS',
        start_date: new Date().toISOString(),
      },
      back_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
      payer_email: params.email,
      external_reference: JSON.stringify({
        tenantId: params.tenantId,
        userId: params.userId,
      }),
      status: 'pending',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`MercadoPago Error: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<MPPreapprovalResponse>;
}

/**
 * Cancel a MercadoPago preapproval subscription.
 */
export async function cancelMPSubscription(subscriptionId: string) {
  const response = await fetch(
    `https://api.mercadopago.com/preapproval/${subscriptionId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`MercadoPago cancel error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Pause a MercadoPago preapproval subscription.
 */
export async function pauseMPSubscription(subscriptionId: string) {
  const response = await fetch(
    `https://api.mercadopago.com/preapproval/${subscriptionId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'paused' }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`MercadoPago pause error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Resume a paused MercadoPago preapproval subscription.
 */
export async function resumeMPSubscription(subscriptionId: string) {
  const response = await fetch(
    `https://api.mercadopago.com/preapproval/${subscriptionId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'authorized' }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`MercadoPago resume error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// ─── PAYMENT DETAILS ─────────────────────────────────────────────────

/**
 * Get payment details by ID from MercadoPago.
 */
export async function getPaymentDetails(paymentId: string) {
  const client = getMercadoPagoClient();
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}

/**
 * Get preapproval (subscription) details by ID from MercadoPago.
 */
export async function getMPSubscriptionDetails(subscriptionId: string) {
  const response = await fetch(
    `https://api.mercadopago.com/preapproval/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`MercadoPago fetch error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// ─── WEBHOOK SIGNATURE VERIFICATION ──────────────────────────────────

/**
 * Verify MercadoPago webhook signature.
 * MP uses x-signature header with format: "ts=timestamp,v1=hash"
 */
export function verifyWebhookSignature(
  dataId: string,
  xRequestId: string,
  xSignature: string | null
): boolean {
  if (!xSignature) return false;

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('MERCADOPAGO_WEBHOOK_SECRET no configurado');
    return false;
  }

  // Parse the x-signature header
  const parts: Record<string, string> = {};
  xSignature.split(',').forEach((part) => {
    const [key, value] = part.trim().split('=');
    if (key && value) parts[key] = value;
  });

  const ts = parts['ts'];
  const v1 = parts['v1'];

  if (!ts || !v1) return false;

  // Build the manifest string per MP docs
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const computedHash = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  return computedHash === v1;
}
