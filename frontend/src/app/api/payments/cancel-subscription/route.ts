import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { SubscriptionService } from '@/lib/payments/subscription-service';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = auth.session.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Contexto de tenant no encontrado' },
        { status: 400 }
      );
    }

    const { subscriptionId, cancelAtPeriodEnd } = await req.json();
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId es requerido' },
        { status: 400 }
      );
    }

    const result = await SubscriptionService.cancelSubscription({
      tenantId,
      subscriptionId,
      cancelAtPeriodEnd: cancelAtPeriodEnd ?? true,
    });

    return NextResponse.json({
      success: true,
      subscription: result,
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al cancelar suscripción' },
      { status: 500 }
    );
  }
}
