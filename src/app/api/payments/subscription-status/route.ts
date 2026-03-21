import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { SubscriptionService } from '@/lib/payments/subscription-service';

export async function GET() {
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

    const subscription = await SubscriptionService.getSubscriptionStatus(tenantId);

    if (!subscription) {
      return NextResponse.json({
        success: true,
        subscription: null,
        hasActiveSubscription: false,
      });
    }

    return NextResponse.json({
      success: true,
      hasActiveSubscription: subscription.status === 'ACTIVE',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: {
          code: subscription.plan.code,
          name: subscription.plan.name,
          priceARS: subscription.plan.priceARS,
        },
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        nextPaymentDate: subscription.nextPaymentDate,
        failedPaymentCount: subscription.failedPaymentCount,
      },
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener estado' },
      { status: 500 }
    );
  }
}
