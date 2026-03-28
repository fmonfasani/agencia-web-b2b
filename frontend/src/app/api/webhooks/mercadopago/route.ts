import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/payments/mercadopago';
import {
  handlePaymentWebhook,
  handleSubscriptionWebhook,
} from '@/lib/payments/webhook-handlers';

export async function POST(req: NextRequest) {
  try {
    // 1. Read query params (MercadoPago sends data in query + body)
    const url = new URL(req.url);
    const dataId = url.searchParams.get('data.id') || '';
    const type = url.searchParams.get('type') || '';

    // 2. Read headers for signature verification
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id') || '';

    // 3. Verify webhook signature (CRITICAL for security)
    if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(dataId, xRequestId, xSignature);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // 4. Also parse body for additional data
    let body: any = {};
    try {
      const rawBody = await req.text();
      if (rawBody) {
        body = JSON.parse(rawBody);
      }
    } catch {
      // Body might be empty for some webhook types
    }

    console.log('📨 Webhook received:', {
      type: type || body.type,
      action: body.action,
      dataId: dataId || body.data?.id,
    });

    // 5. Route by event type
    const eventType = type || body.type;
    const eventDataId = dataId || body.data?.id;

    if (eventType === 'payment' && eventDataId) {
      await handlePaymentWebhook({ id: eventDataId });
    } else if (eventType === 'subscription_preapproval' && eventDataId) {
      await handleSubscriptionWebhook({ id: eventDataId });
    } else {
      console.log('⚠️ Unhandled webhook type:', eventType);
    }

    // 6. ALWAYS return 200 OK (MercadoPago requires this to stop retries)
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('💥 Webhook error:', error);

    // Return 200 even on error to prevent MercadoPago retry storms.
    // The error is logged for investigation.
    return NextResponse.json(
      { received: true, error: 'Internal error logged' },
      { status: 200 }
    );
  }
}
