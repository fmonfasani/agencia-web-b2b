"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { AgentMetricsChart } from "@/components/dashboard/AgentMetricsChart";
import {
  PageTransition,
  StaggerItem,
} from "@/components/animations/PageTransition";
import { getObservabilityData } from "@/app/actions/observability";

type MetricPoint = {
  date: string;
  queries: number;
  avgDuration: number;
  errorRate: number;
};

const ERROR_REASONS = ["error", "timeout", "embedding_error", "llm_error"];

const STATUS_LABEL: Record<string, { label: string; ok: boolean }> = {
  results_found: { label: "Respuesta encontrada", ok: true },
  rag_only: { label: "Solo RAG", ok: true },
  no_results: { label: "Sin resultados", ok: false },
  forced_stop: { label: "Parada forzada", ok: false },
  max_iterations: { label: "Límite iteraciones", ok: false },
  loop_detected: { label: "Loop detectado", ok: false },
  llm_error: { label: "Error LLM", ok: false },
  embedding_error: { label: "Error embedding", ok: false },
  timeout: { label: "Timeout", ok: false },
  finished: { label: "Finalizado", ok: true },
};

export default function ObservabilityPage() {
  const [traces, setTraces] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState<MetricPoint[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tenantIds, setTenantIds] = useState<string[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadData = (tenantId?: string) => {
    setLoading(true);
    getObservabilityData(tenantId || undefined)
      .then((data) => {
        if (!data) return;
        setIsAdmin(data.isAdmin);
        setTenantIds(data.tenantIds);
        setMetrics(data.metrics);

        const raw = Array.isArray(data.traces) ? data.traces : [];
        setTraces(raw);

        const byDate: Record<
          string,
          { queries: number; duration: number; errors: number; count: number }
        > = {};
        raw.forEach((trace: any) => {
          const date = new Date(trace.created_at).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
          });
          if (!byDate[date])
            byDate[date] = { queries: 0, duration: 0, errors: 0, count: 0 };
          byDate[date].queries++;
          byDate[date].duration += trace.total_duration_ms || 0;
          const fr = trace.metadata?.finish_reason ?? "";
          if (ERROR_REASONS.includes(fr)) byDate[date].errors++;
          byDate[date].count++;
        });

        const computed = Object.entries(byDate)
          .slice(-14)
          .map(([date, d]) => ({
            date,
            queries: d.queries,
            avgDuration: Math.round(d.duration / d.count),
            errorRate: parseFloat(((d.errors / d.count) * 100).toFixed(1)),
          }));

        setMetricsData(computed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTenantChange = (tid: string) => {
    setSelectedTenant(tid);
    startTransition(() => loadData(tid || undefined));
  };

  const topClientsData = metrics?.tenant_breakdown?.map((t: any) => ({
    name: t.tenant_id,
    mrr: t.total_executions,
  })) ?? [{ name: metrics?.tenant_id ?? "Mi Agente", mrr: traces.length }];

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Observabilidad
              </h1>
              <p className="text-gray-600">
                Monitorea el rendimiento y salud de tus agentes
              </p>
            </div>

            {/* Admin tenant selector */}
            {isAdmin && tenantIds.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 font-medium">
                  Tenant:
                </label>
                <select
                  value={selectedTenant}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los tenants</option>
                  {tenantIds.map((tid) => (
                    <option key={tid} value={tid}>
                      {tid}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </StaggerItem>

        {/* KPI Summary */}
        {metrics && (
          <StaggerItem>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total ejecuciones",
                  value: metrics.total_executions ?? 0,
                },
                {
                  label: "Latencia promedio",
                  value: `${Math.round(metrics.avg_duration_ms ?? 0)}ms`,
                },
                {
                  label: "Tasa de éxito",
                  value: `${((metrics.success_rate ?? 0) * 100).toFixed(1)}%`,
                },
                { label: "Errores", value: metrics.error_count ?? 0 },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="bg-white border border-gray-200 rounded-lg p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          </StaggerItem>
        )}

        <AgentMetricsChart
          metricsData={metricsData}
          topClientsData={topClientsData}
        />

        <StaggerItem>
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Últimas Consultas
              {isAdmin && selectedTenant && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  — {selectedTenant}
                </span>
              )}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {isAdmin && (
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Tenant
                      </th>
                    )}
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Consulta
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Modelo
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Iteraciones
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Duración
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td colSpan={isAdmin ? 6 : 5} className="py-3 px-4">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : traces.length > 0 ? (
                    traces.slice(0, 25).map((trace, idx) => {
                      const finish = trace.metadata?.finish_reason ?? "";
                      const status = STATUS_LABEL[finish] ?? {
                        label: finish || "—",
                        ok: !ERROR_REASONS.includes(finish),
                      };
                      const durationMs = trace.total_duration_ms ?? 0;
                      const durationLabel =
                        durationMs >= 60000
                          ? `${(durationMs / 60000).toFixed(1)}m`
                          : `${durationMs}ms`;
                      return (
                        <motion.tr
                          key={idx}
                          className="border-b border-gray-100 hover:bg-gray-50"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.03 }}
                        >
                          {isAdmin && (
                            <td className="py-3 px-4 font-mono text-xs text-blue-600">
                              {trace.tenant_id}
                            </td>
                          )}
                          <td className="py-3 px-4 max-w-xs truncate">
                            {trace.query || "—"}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-gray-500">
                            {trace.metadata?.model || "—"}
                          </td>
                          <td className="py-3 px-4 text-center text-gray-600">
                            {trace.iterations ?? 0}
                          </td>
                          <td
                            className={`py-3 px-4 font-mono text-xs ${durationMs >= 30000 ? "text-orange-600 font-semibold" : ""}`}
                          >
                            {durationLabel}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                status.ok
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {status.ok ? "✓" : "✗"} {status.label}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={isAdmin ? 6 : 5}
                        className="py-8 text-center text-gray-500"
                      >
                        No hay consultas registradas aún
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </StaggerItem>
      </div>
    </PageTransition>
  );
}
