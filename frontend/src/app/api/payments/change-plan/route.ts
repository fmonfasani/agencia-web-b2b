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

    const { subscriptionId, newPlanCode } = await req.json();
    if (!subscriptionId || !newPlanCode) {
      return NextResponse.json(
        { error: 'subscriptionId y newPlanCode son requeridos' },
        { status: 400 }
      );
    }

    const result = await SubscriptionService.changePlan({
      tenantId,
      subscriptionId,
      newPlanCode,
    });

    return NextResponse.json({
      success: true,
      requiresNewCheckout: result.requiresNewCheckout,
      newPlan: {
        code: result.newPlan.code,
        name: result.newPlan.name,
        priceARS: result.newPlan.priceARS,
      },
      isUpgrade: result.isUpgrade,
    });
  } catch (error: any) {
    console.error('Change plan error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al cambiar plan' },
      { status: 500 }
    );
  }
}
