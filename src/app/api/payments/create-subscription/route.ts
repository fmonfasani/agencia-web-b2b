import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { SubscriptionService } from '@/lib/payments/subscription-service';
import { ratelimit } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting
    const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success } = await ratelimit.limit(`subscription:create:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intentá de nuevo en 1 minuto.' },
        { status: 429 }
      );
    }

    // 2. Auth
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 3. Validate tenant context
    const tenantId = auth.session.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Contexto de tenant no encontrado' },
        { status: 400 }
      );
    }

    // 4. Parse body
    const { planCode } = await req.json();
    if (!planCode) {
      return NextResponse.json(
        { error: 'planCode es requerido' },
        { status: 400 }
      );
    }

    // 5. Create subscription
    const result = await SubscriptionService.createSubscription({
      tenantId,
      userId: auth.user.id,
      planCode,
      userEmail: auth.user.email!,
    });

    // 6. Return checkout URL
    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      sandboxUrl: result.sandboxUrl,
      subscriptionId: result.subscription.id,
    });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear suscripción' },
      { status: 500 }
    );
  }
}
