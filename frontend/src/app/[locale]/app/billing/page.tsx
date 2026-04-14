"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { Cpu, DollarSign, Zap, BarChart2 } from "lucide-react";
import {
  PageTransition,
  StaggerItem,
} from "@/components/animations/PageTransition";
import { getBillingData, type BillingData } from "@/app/actions/billing";

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("es-ES", { maximumFractionDigits: decimals });
}

function fmtCost(n: number) {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `< $0.01`;
  return `$${n.toFixed(4)}`;
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadData = (tenantId?: string) => {
    setLoading(true);
    getBillingData(tenantId || undefined)
      .then(setData)
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

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <StaggerItem>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Facturación
              </h1>
              <p className="text-gray-600">
                Consumo de tokens y costos por modelo LLM
              </p>
            </div>
            {data?.isAdmin && data.tenantIds.length > 0 && (
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
                  {data.tenantIds.map((tid) => (
                    <option key={tid} value={tid}>
                      {tid}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </StaggerItem>

        {/* KPI Cards */}
        <StaggerItem>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Ejecuciones totales",
                value: loading ? "—" : fmt(data?.totalExecutions ?? 0),
                icon: BarChart2,
                color: "text-blue-600",
              },
              {
                label: "Tokens entrada",
                value: loading ? "—" : fmtTokens(data?.totalTokensIn ?? 0),
                icon: Zap,
                color: "text-indigo-600",
              },
              {
                label: "Tokens salida",
                value: loading ? "—" : fmtTokens(data?.totalTokensOut ?? 0),
                icon: Cpu,
                color: "text-purple-600",
              },
              {
                label: "Costo estimado",
                value: loading ? "—" : fmtCost(data?.totalCostUsd ?? 0),
                icon: DollarSign,
                color: "text-green-600",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="bg-white border border-gray-200 rounded-lg p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon size={16} className={kpi.color} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {kpi.label}
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              </div>
            ))}
          </div>
        </StaggerItem>

        {/* By Model table */}
        <StaggerItem>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Consumo por modelo
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-gray-100 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : !data || data.byModel.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Sin datos de tokens aún — ejecuta algunos agentes primero
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Modelo
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Ejecuciones
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Tokens entrada
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Tokens salida
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Costo
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        % del total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byModel.map((m, idx) => {
                      const pct =
                        data.totalCostUsd > 0
                          ? ((m.costUsd / data.totalCostUsd) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <motion.tr
                          key={m.model}
                          className="border-b border-gray-100 hover:bg-gray-50"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.04 }}
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">
                              {m.label}
                            </div>
                            <div className="font-mono text-xs text-gray-400">
                              {m.model}
                            </div>
                            {m.isLocal && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                local · gratis
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700">
                            {fmt(m.executions)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-600">
                            {fmtTokens(m.tokensIn)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-600">
                            {fmtTokens(m.tokensOut)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                            {fmtCost(m.costUsd)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full"
                                  style={{
                                    width: `${Math.min(100, parseFloat(pct))}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-10 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        Total
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {fmt(data.totalExecutions)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        {fmtTokens(data.totalTokensIn)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        {fmtTokens(data.totalTokensOut)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        {fmtCost(data.totalCostUsd)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-500">
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </StaggerItem>

        {/* Admin: By Tenant */}
        {data?.isAdmin && data.byTenant.length > 0 && (
          <StaggerItem>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Consumo por tenant
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Tenant
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Ejecuciones
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Tokens entrada
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Tokens salida
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Costo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byTenant.map((t, idx) => (
                      <motion.tr
                        key={t.tenantId}
                        className="border-b border-gray-100 hover:bg-gray-50"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.04 }}
                      >
                        <td className="py-3 px-4 font-mono text-xs text-blue-600">
                          {t.tenantId}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {fmt(t.executions)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-600">
                          {fmtTokens(t.tokensIn)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-600">
                          {fmtTokens(t.tokensOut)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                          {fmtCost(t.costUsd)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </StaggerItem>
        )}

        {/* Monthly breakdown */}
        {data && data.byMonth.length > 0 && (
          <StaggerItem>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Evolución mensual
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Mes
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Ejecuciones
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Tokens totales
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">
                        Costo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byMonth.map((m, idx) => (
                      <motion.tr
                        key={m.month}
                        className="border-b border-gray-100 hover:bg-gray-50"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.04 }}
                      >
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {m.month}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {fmt(m.executions)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-600">
                          {fmtTokens(m.tokensIn + m.tokensOut)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                          {fmtCost(m.costUsd)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </StaggerItem>
        )}

        {/* Note about local models */}
        <StaggerItem>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
            <strong>Nota:</strong> Los modelos locales (Ollama) tienen costo
            $0.00. Los precios de OpenRouter son estimados basados en tarifas
            públicas por 1M tokens y pueden variar. Para facturación exacta
            verifica en tu dashboard de OpenRouter.
          </div>
        </StaggerItem>
      </div>
    </PageTransition>
  );
}
