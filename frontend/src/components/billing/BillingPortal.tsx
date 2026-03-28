'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  ArrowUpRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import SubscriptionStatus from './SubscriptionStatus';

interface SubscriptionData {
  id: string;
  status: string;
  plan: {
    code: string;
    name: string;
    priceARS: number;
  };
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  nextPaymentDate: string | null;
  failedPaymentCount: number;
}

export default function BillingPortal() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/payments/subscription-status');
      const data = await response.json();
      setSubscription(data.subscription);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;

    const confirmed = window.confirm(
      '¿Estás seguro que querés cancelar tu suscripción? Se mantendrá activa hasta el final del período actual.'
    );
    if (!confirmed) return;

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          cancelAtPeriodEnd: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cancelar');
      }

      await fetchSubscription();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <CreditCard size={40} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-text-main mb-2">
          No tenés suscripción activa
        </h3>
        <p className="text-sm text-text-secondary mb-6">
          Suscribite para acceder a todas las funcionalidades.
        </p>
        <a
          href="/pricing"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
        >
          Ver Planes
          <ArrowUpRight size={16} />
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50/50 border-b border-slate-100 p-6">
        <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
          <CreditCard size={20} className="text-primary" />
          Suscripción Actual
        </h3>
      </div>

      {/* Content */}
      <div className="p-6 space-y-5">
        {/* Status */}
        <SubscriptionStatus
          status={subscription.status}
          planName={subscription.plan.name}
          currentPeriodEnd={subscription.currentPeriodEnd}
          cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
        />

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Plan
            </p>
            <p className="text-sm font-bold text-text-main">
              {subscription.plan.name}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Precio
            </p>
            <p className="text-sm font-bold text-text-main">
              ARS{' '}
              {subscription.plan.priceARS.toLocaleString('es-AR')}/mes
            </p>
          </div>
          <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Próximo Pago
            </p>
            <p className="text-sm font-bold text-text-main">
              {subscription.nextPaymentDate
                ? new Date(
                    subscription.nextPaymentDate
                  ).toLocaleDateString('es-AR')
                : 'N/A'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Estado
            </p>
            <SubscriptionStatus
              status={subscription.status}
              planName=""
              currentPeriodEnd={subscription.currentPeriodEnd}
              cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
              compact
            />
          </div>
        </div>

        {/* Failed payments warning */}
        {subscription.failedPaymentCount > 0 && (
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle size={16} />
            {subscription.failedPaymentCount} pago(s) fallido(s).
            Actualizá tu método de pago.
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 font-medium">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <a
            href="/pricing"
            className="flex-1 py-3 rounded-xl font-bold text-sm text-center uppercase tracking-wider bg-primary text-white hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            Cambiar Plan
          </a>

          {!subscription.cancelAtPeriodEnd &&
            subscription.status === 'ACTIVE' && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="py-3 px-6 rounded-xl font-bold text-sm uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Cancelar'
                )}
              </button>
            )}
        </div>
      </div>
    </div>
  );
}
