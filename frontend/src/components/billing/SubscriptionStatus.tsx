'use client';

import React from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle, Pause } from 'lucide-react';

interface SubscriptionStatusProps {
  status: string;
  planName: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  compact?: boolean;
}

const statusConfig: Record<string, {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
}> = {
  ACTIVE: {
    icon: CheckCircle,
    label: 'Activo',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  PENDING: {
    icon: Clock,
    label: 'Pendiente',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  PAST_DUE: {
    icon: AlertTriangle,
    label: 'Pago Vencido',
    color: 'text-orange-700',
    bg: 'bg-orange-50 border-orange-200',
  },
  CANCELLED: {
    icon: XCircle,
    label: 'Cancelado',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
  },
  PAUSED: {
    icon: Pause,
    label: 'Pausado',
    color: 'text-slate-700',
    bg: 'bg-slate-50 border-slate-200',
  },
};

export default function SubscriptionStatus({
  status,
  planName,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  compact = false,
}: SubscriptionStatusProps) {
  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;
  const endDate = new Date(currentPeriodEnd).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.color}`}
      >
        <Icon size={12} />
        {config.label}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${config.bg}`}>
      <div className="flex items-center gap-3">
        <Icon size={20} className={config.color} />
        <div>
          <p className={`font-bold text-sm ${config.color}`}>
            {planName} — {config.label}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {status === 'ACTIVE'
              ? `Próximo pago: ${endDate}`
              : `Período finaliza: ${endDate}`}
          </p>
        </div>
      </div>

      {cancelAtPeriodEnd && status === 'ACTIVE' && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-100/50 rounded-lg px-3 py-2">
          <AlertTriangle size={14} />
          Se cancelará el {endDate}
        </div>
      )}
    </div>
  );
}
