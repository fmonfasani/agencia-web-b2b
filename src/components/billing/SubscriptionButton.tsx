'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SubscriptionButtonProps {
  planCode: string;
  planName: string;
  price: number;
  currentPlan?: boolean;
  highlight?: boolean;
}

export default function SubscriptionButton({
  planCode,
  planName,
  price,
  currentPlan = false,
  highlight = false,
}: SubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar suscripción');
      }

      // Redirect to MercadoPago checkout
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (currentPlan) {
    return (
      <button
        disabled
        className="w-full py-3 px-6 rounded-xl font-bold text-sm uppercase tracking-wider bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200"
      >
        Plan Actual
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className={`w-full py-3 px-6 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
          highlight
            ? 'bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20 disabled:opacity-60'
            : 'bg-slate-50 text-text-main hover:bg-slate-100 border border-slate-200 disabled:opacity-60'
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Procesando...
          </>
        ) : (
          `Suscribirse — ARS ${price.toLocaleString('es-AR')}/mes`
        )}
      </button>

      {error && (
        <p className="text-xs font-medium text-red-600 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
