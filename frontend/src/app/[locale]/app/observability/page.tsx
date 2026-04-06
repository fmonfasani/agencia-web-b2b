"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AgentMetricsChart } from "@/components/dashboard/AgentMetricsChart";
import {
  PageTransition,
  StaggerItem,
} from "@/components/animations/PageTransition";
import { saasClientFor } from "@/lib/saas-client";

const MOCK_METRICS = [
  { date: "1 abr", queries: 1200, avgDuration: 245, errorRate: 0.2 },
  { date: "2 abr", queries: 1900, avgDuration: 300, errorRate: 0.3 },
  { date: "3 abr", queries: 1700, avgDuration: 220, errorRate: 0.1 },
  { date: "4 abr", queries: 2200, avgDuration: 280, errorRate: 0.4 },
  { date: "5 abr", queries: 2290, avgDuration: 245, errorRate: 0.2 },
];

const TOP_AGENTS = [
  { name: "Recepción", mrr: 2400 },
  { name: "Soporte", mrr: 1398 },
  { name: "Ventas", mrr: 980 },
];

export default function ObservabilityPage() {
  const [traces, setTraces] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState(MOCK_METRICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch session from API endpoint — no SessionProvider needed
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        const apiKey = (session?.user as any)?.apiKey;
        if (!apiKey) {
          setLoading(false);
          return;
        }

        const client = saasClientFor(apiKey);
        client.agent
          .traces()
          .then((data) => {
            if (!data?.length) return;
            setTraces(data);

            const byDate: Record<string, any> = {};
            data.forEach((trace: any) => {
              const date = new Date(trace.created_at).toLocaleDateString(
                "es-ES",
                { day: "numeric", month: "short" },
              );
              if (!byDate[date])
                byDate[date] = {
                  queries: 0,
                  duration: 0,
                  errors: 0,
                  count: 0,
                };
              byDate[date].queries++;
              byDate[date].duration += trace.total_duration_ms || 0;
              if (trace.success === false) byDate[date].errors++;
              byDate[date].count++;
            });

            const computed = Object.entries(byDate)
              .map(([date, d]) => ({
                date,
                queries: (d as any).queries * 100,
                avgDuration: Math.round((d as any).duration / (d as any).count),
                errorRate: parseFloat(
                  (((d as any).errors / (d as any).count) * 100).toFixed(1),
                ),
              }))
              .slice(-5);

            if (computed.length > 0) setMetricsData(computed);
          })
          .catch(() => {
            /* backend not ready, use mock */
          })
          .finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Observabilidad
            </h1>
            <p className="text-gray-600">
              Monitorea el rendimiento y salud de tus agentes
            </p>
          </div>
        </StaggerItem>

        <AgentMetricsChart
          metricsData={metricsData}
          topClientsData={TOP_AGENTS}
        />

        <StaggerItem>
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Últimas Consultas
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Consulta
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Resultado
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
                        <td colSpan={4} className="py-3 px-4">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : traces.length > 0 ? (
                    traces.slice(0, 10).map((trace, idx) => (
                      <motion.tr
                        key={idx}
                        className="border-b border-gray-100 hover:bg-gray-50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                      >
                        <td className="py-3 px-4 max-w-sm truncate">
                          {trace.query || "Sin consulta"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-sm truncate">
                          {trace.result || "Sin resultado"}
                        </td>
                        <td className="py-3 px-4">
                          {trace.total_duration_ms}ms
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              trace.success === false
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {trace.success === false ? "✗ Error" : "✓ Exitoso"}
                          </span>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
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
