import { useEffect, useState, useCallback } from "react";
import { saasClientFor } from "@/lib/saas-client";

interface MetricsUpdate {
  timestamp: number;
  metrics: {
    queriesPerDay: number;
    avgLatency: number;
    errorRate: number;
    uptime: number;
  };
}

/**
 * Hook para obtener métricas en tiempo real del agente
 * Realiza polling cada N segundos para mantener datos actualizados
 */
export function useRealtimeMetrics(
  apiKey: string,
  interval: number = 10000 // 10 segundos por defecto
) {
  const [metrics, setMetrics] = useState<MetricsUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const client = saasClientFor(apiKey);
      const data = await client.agent.metrics();

      if (data) {
        setMetrics({
          timestamp: Date.now(),
          metrics: {
            queriesPerDay: Math.round(
              (data.total_executions || 0) / 30
            ),
            avgLatency: Math.round(data.avg_duration_ms || 0),
            errorRate: parseFloat(
              (((data.error_count || 0) / (data.total_executions || 1)) * 100).toFixed(1)
            ),
            uptime: 99.98, // Placeholder - obtener de health endpoint
          },
        });
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setError(err instanceof Error ? err.message : "Error fetching metrics");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    // Fetch inmediato
    fetchMetrics();

    // Setup polling
    const pollInterval = setInterval(fetchMetrics, interval);

    return () => clearInterval(pollInterval);
  }, [fetchMetrics, interval]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

/**
 * Hook para obtener trazas en tiempo real
 * Actualiza cada N segundos
 */
export function useRealtimeTraces(
  apiKey: string,
  interval: number = 15000 // 15 segundos
) {
  const [traces, setTraces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestTraceCount, setLatestTraceCount] = useState(0);

  const fetchTraces = useCallback(async () => {
    try {
      const client = saasClientFor(apiKey);
      const data = await client.agent.traces();

      if (data && Array.isArray(data)) {
        setTraces(data);
        setLatestTraceCount(data.length);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching traces:", err);
      setError(err instanceof Error ? err.message : "Error fetching traces");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    // Fetch inmediato
    fetchTraces();

    // Setup polling
    const pollInterval = setInterval(fetchTraces, interval);

    return () => clearInterval(pollInterval);
  }, [fetchTraces, interval]);

  // Detectar traces nuevas
  const newTracesCount = traces.length - latestTraceCount;
  const hasNewTraces = newTracesCount > 0;

  return {
    traces,
    loading,
    error,
    newTracesCount,
    hasNewTraces,
    refetch: fetchTraces,
  };
}

/**
 * Hook para obtener health status en tiempo real
 */
export function useRealtimeHealth(
  apiKey: string,
  interval: number = 30000 // 30 segundos
) {
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const client = saasClientFor(apiKey);
      const data = await client.health();

      if (data) {
        setHealth({
          status: data.status,
          timestamp: new Date().toISOString(),
          services: {
            postgres: data.dependencies?.find((d: any) => d.service === "postgresql")?.status === "healthy",
            qdrant: data.dependencies?.find((d: any) => d.service === "qdrant")?.status === "healthy",
            ollama: data.dependencies?.find((d: any) => d.service === "ollama")?.status === "healthy",
          },
        });
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching health:", err);
      setError(err instanceof Error ? err.message : "Error fetching health");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    // Fetch inmediato
    fetchHealth();

    // Setup polling
    const pollInterval = setInterval(fetchHealth, interval);

    return () => clearInterval(pollInterval);
  }, [fetchHealth, interval]);

  return { health, loading, error, refetch: fetchHealth };
}
