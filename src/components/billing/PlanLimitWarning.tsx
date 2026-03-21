'use client';

import React from 'react';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';

interface PlanLimitWarningProps {
  resource: string;
  current: number;
  limit: number;
  showUpgradeLink?: boolean;
}

export default function PlanLimitWarning({
  resource,
  current,
  limit,
  showUpgradeLink = true,
}: PlanLimitWarningProps) {
  const percentage = Math.min((current / limit) * 100, 100);
  const isAtLimit = current >= limit;
  const isNearLimit = percentage >= 80 && !isAtLimit;

  if (percentage < 80) return null;

  return (
    <div
      className={`rounded-xl border p-4 ${
        isAtLimit
          ? 'bg-red-50 border-red-200'
          : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={18}
          className={isAtLimit ? 'text-red-600 mt-0.5' : 'text-amber-600 mt-0.5'}
        />
        <div className="flex-1">
          <p
            className={`text-sm font-bold ${
              isAtLimit ? 'text-red-700' : 'text-amber-700'
            }`}
          >
            {isAtLimit
              ? `Límite de ${resource} alcanzado`
              : `Cerca del límite de ${resource}`}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Usás {current} de {limit} {resource} disponibles.
          </p>

          {/* Progress bar */}
          <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isAtLimit ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {showUpgradeLink && isAtLimit && (
            <a
              href="/pricing"
              className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-primary hover:underline"
            >
              Hacé upgrade
              <ArrowUpRight size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
