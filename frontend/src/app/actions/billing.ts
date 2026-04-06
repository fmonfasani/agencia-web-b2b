"use server";

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  agentId: string;
  plan: "monthly" | "annual";
  amount: number;
}

/**
 * Iniciar checkout — stub para integración futura con Stripe/MercadoPago
 */
export async function initiateCheckout(
  agentId: string,
  plan: "monthly" | "annual",
  agentName: string,
  price: number
): Promise<{ success: boolean; data?: CheckoutSession; error?: string }> {
  try {
    // TODO: Integración real con Stripe
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const session = await stripe.checkout.sessions.create({ ... })

    const amount = plan === "annual" ? price * 10 : price;
    const sessionId = `cs_${Date.now()}_${agentId}`;

    // Mock response — en producción redirigiría a Stripe Checkout
    return {
      success: true,
      data: {
        sessionId,
        checkoutUrl: `/checkout/success?session_id=${sessionId}&agent_id=${agentId}`,
        agentId,
        plan,
        amount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al iniciar checkout",
    };
  }
}

/**
 * Confirmar pago exitoso
 */
export async function handlePaymentSuccess(
  sessionId: string
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  try {
    // TODO: Verificar con Stripe que el pago fue real
    // const session = await stripe.checkout.sessions.retrieve(sessionId)
    // if (session.payment_status !== 'paid') throw new Error('Payment not completed')

    return {
      success: true,
      subscriptionId: `sub_${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al confirmar pago",
    };
  }
}

/**
 * Cancelar suscripción
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Cancelar en Stripe
    // await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cancelar",
    };
  }
}
