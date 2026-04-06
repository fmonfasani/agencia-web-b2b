"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { PageTransition } from "@/components/animations/PageTransition";
import { useToast } from "@/hooks/useToast";
import { getAgentComparison } from "@/app/actions/agent";
import { useSession } from "next-auth/react";

interface ComparisonData {
  myMetrics: { queries: number; latency: number; errorRate: number; successRate: number };
  marketAverage: { queries: number; latency: number; errorRate: number; successRate: number };
}

function DiffBadge({ diff, invertGood = false }: { diff: number; invertGood?: boolean }) {
  const isGood = invertGood ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const cls = diff === 0
    ? "bg-gray-100 text-gray-600"
    : isGood
    ? "bg-green-100 text-green-700"
    : "bg-red-100 text-red-700";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <Icon size={12} />
      {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
    </span>
  );
}

export default function AgentComparePage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const { data: session } = useSession();
  const { addToast } = useToast();

  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiKey = (session?.user as any)?.apiKey;
    if (!apiKey) return;

    getAgentComparison(agentId, apiKey).then((res) => {
      if (res.success && res.data) setData(res.data as ComparisonData);
      else addToast("Error al cargar comparación", "error");
      setLoading(false);
    });
  }, [agentId, session]);

  const rows = data
    ? [
        {
          metric: "Queries/día",
          mine: data.myMetrics.queries,
          avg: data.marketAverage.queries,
          unit: "",
          invertGood: false,
        },
        {
          metric: "Latencia prom. (ms)",
          mine: data.myMetrics.latency,
          avg: data.marketAverage.latency,
          unit: "ms",
          invertGood: true,
        },
        {
          metric: "Tasa de error (%)",
          mine: data.myMetrics.errorRate,
          avg: data.marketAverage.errorRate,
          unit: "%",
          invertGood: true,
        },
        {
          metric: "Tasa de éxito (%)",
          mine: data.myMetrics.successRate,
          avg: data.marketAverage.successRate,
          unit: "%",
          invertGood: false,
        },
      ]
    : [];

  const chartData = rows.map((r) => ({
    name: r.metric.split("(")[0].trim(),
    "Mi Agente": r.mine,
    Promedio: r.avg,
  }));

  const insights = data
    ? [
        data.myMetrics.queries > data.marketAverage.queries
          ? `✅ Tu agente procesa ${Math.round(((data.myMetrics.queries - data.marketAverage.queries) / data.marketAverage.queries) * 100)}% más queries que el promedio`
          : `⚠️ Tu agente procesa menos queries que el promedio del mercado`,
        data.myMetrics.latency < data.marketAverage.latency
          ? `✅ Latencia ${Math.round(((data.marketAverage.latency - data.myMetrics.latency) / data.marketAverage.latency) * 100)}% mejor que el promedio`
          : `⚠️ La latencia está por encima del promedio — considera optimizar`,
        data.myMetrics.errorRate < data.marketAverage.errorRate
          ? `✅ Tasa de error excelente — ${Math.round(((data.marketAverage.errorRate - data.myMetrics.errorRate) / data.marketAverage.errorRate) * 100)}% mejor que el mercado`
          : `⚠️ La tasa de error supera el promedio — revisar configuración`,
        data.myMetrics.successRate > 99
          ? `🏆 Tu agente está en el TOP 5% de confiabilidad`
          : `ℹ️ Tasa de éxito del ${data.myMetrics.successRate.toFixed(1)}%`,
      ]
    : [];

  return (
    <PageTransition>
      <div className="space-y-6">
        <Link href={`../${agentId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} />
          Volver al agente
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comparación de Rendimiento</h1>
          <p className="text-gray-500 mt-1">Tu agente vs. el promedio del mercado</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Comparison Table */}
            <motion.div
              className="border border-gray-200 rounded-lg bg-white overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Métrica</th>
                    <th className="text-right py-3 px-5 font-semibold text-blue-700">Mi Agente</th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-500">Promedio</th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-700">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const diff = row.avg !== 0
                      ? ((row.mine - row.avg) / row.avg) * 100
                      : 0;
                    return (
                      <motion.tr
                        key={row.metric}
                        className="border-t border-gray-100 hover:bg-gray-50"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                      >
                        <td className="py-4 px-5 font-medium text-gray-700">{row.metric}</td>
                        <td className="py-4 px-5 text-right font-bold text-blue-700">
                          {row.mine.toLocaleString()}{row.unit}
                        </td>
                        <td className="py-4 px-5 text-right text-gray-500">
                          {row.avg.toLocaleString()}{row.unit}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <DiffBadge diff={diff} invertGood={row.invertGood} />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>

            {/* Chart */}
            <motion.div
              className="border border-gray-200 rounded-lg p-6 bg-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Comparación Visual</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Mi Agente" fill="#0066FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Promedio" fill="#D1D5DB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Insights */}
            <motion.div
              className="border border-gray-200 rounded-lg p-6 bg-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Insights</h3>
              <ul className="space-y-3">
                {insights.map((insight, i) => (
                  <li key={i} className="text-sm text-gray-700 leading-relaxed">{insight}</li>
                ))}
              </ul>
            </motion.div>
          </>
        ) : null}
      </div>
    </PageTransition>
  );
}
