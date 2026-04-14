"use client";

/**
 * hooks/useAnalytics.ts
 *
 * Client hook for billing/analytics data.
 * Calls the getBillingData server action — never touches the DB directly.
 *
 * Usage:
 *   const { data, loading, error, refresh } = useAnalytics();
 *   const { data } = useAnalytics({ tenantId: "t_abc" }); // admin filter
 */

import { useState, useEffect, useCallback } from "react";
import { getBillingData, type BillingData } from "@/app/actions/billing";

interface UseAnalyticsOptions {
  /** Admin only: filter by a specific tenant */
  tenantId?: string;
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

interface UseAnalyticsState {
  data: BillingData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAnalytics(
  options: UseAnalyticsOptions = {},
): UseAnalyticsState {
  const { tenantId, autoFetch = true } = options;

  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBillingData(tenantId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar analytics");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch]);

  return { data, loading, error, refresh: fetch };
}

// ── Derived selectors ─────────────────────────────────────────────────────────

/** Total executions this month */
export function useTotalExecutions(data: BillingData | null): number {
  return data?.totalExecutions ?? 0;
}

/** Total cost this month in USD */
export function useTotalCostUsd(data: BillingData | null): number {
  return data?.totalCostUsd ?? 0;
}

/** Whether the tenant is using local (free) models exclusively */
export function useIsLocalOnly(data: BillingData | null): boolean {
  if (!data?.byModel?.length) return true;
  return data.byModel.every((m) => m.isLocal);
}
