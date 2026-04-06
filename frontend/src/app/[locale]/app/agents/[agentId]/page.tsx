"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageTransition } from "@/components/animations/PageTransition";
import { useToast } from "@/hooks/useToast";
import {
  getAgentDetails, getAgentMetrics, getAgentLogs, toggleAgentStatus,
  AgentDetails, AgentMetrics, AgentLog,
} from "@/app/actions/agent";
import AgentOverview from "@/components/agent/AgentOverview";
import AgentPerformance from "@/components/agent/AgentPerformance";
import AgentLogs from "@/components/agent/AgentLogs";
import AgentConfiguration from "@/components/agent/AgentConfiguration";
import AgentIntegrations from "@/components/agent/AgentIntegrations";

const TABS = ["Overview", "Performance", "Logs", "Configuración", "Integraciones"] as const;
type Tab = typeof TABS[number];

export default function AgentDetailsPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const { data: session } = useSession();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [details, setDetails] = useState<AgentDetails | null>(null);
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const dateRange = {
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  };

  const loadData = useCallback(async () => {
    const apiKey = (session?.user as any)?.apiKey;
    if (!apiKey) return;

    setLoading(true);
    setError(null);

    try {
      const [detailsRes, metricsRes, logsRes] = await Promise.all([
        getAgentDetails(agentId, apiKey),
        getAgentMetrics(agentId, apiKey, dateRange),
        getAgentLogs(agentId, apiKey, 50),
      ]);

      if (detailsRes.success && detailsRes.data) setDetails(detailsRes.data);
      if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
      if (logsRes.success && logsRes.data) setLogs(logsRes.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error cargando datos";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [agentId, session]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleStatus = async () => {
    const apiKey = (session?.user as any)?.apiKey;
    if (!apiKey || !details) return;

    setToggling(true);
    try {
      const res = await toggleAgentStatus(agentId, apiKey);
      if (res.success) {
        const next = details.status === "active" ? "inactive" : "active";
        setDetails({ ...details, status: next });
        addToast(`Agente ${next === "active" ? "activado" : "desactivado"}`, "success");
      }
    } catch (err) {
      addToast("Error al cambiar estado", "error");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      </PageTransition>
    );
  }

  if (error || !details) {
    return (
      <PageTransition>
        <div className="border border-red-200 bg-red-50 rounded-lg p-8 text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-semibold">Error al cargar el agente</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Back */}
        <div className="flex items-center justify-between">
          <Link href="../agents" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={16} />
            Mis Agentes
          </Link>
          <Link
            href={`${agentId}/compare`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver comparación vs. mercado →
          </Link>
        </div>

        {/* Header */}
        <motion.div
          className="flex items-start justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{details.name}</h1>
            <p className="text-gray-500 mt-1">{details.type}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              details.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {details.status === "active" ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {details.status === "active" ? "Activo" : "Inactivo"}
            </div>
            <button
              onClick={handleToggleStatus}
              disabled={toggling}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                details.status === "active"
                  ? "bg-red-50 text-red-700 hover:bg-red-100"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {toggling ? "..." : details.status === "active" ? "Desactivar" : "Activar"}
            </button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Queries/día", value: details.metrics.queriesPerDay.toLocaleString(), color: "blue" },
            { label: "Latencia prom.", value: `${details.metrics.avgLatency.toFixed(0)}ms`, color: "yellow" },
            { label: "Tasa de éxito", value: `${details.metrics.successRate.toFixed(1)}%`, color: "green" },
            { label: "Tasa de error", value: `${details.metrics.errorRate.toFixed(2)}%`, color: "red" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              className="border border-gray-200 rounded-lg p-4 bg-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
              <p className={`text-2xl font-bold text-${kpi.color}-600`}>{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div>
          <div className="border-b border-gray-200 flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === "Overview" && <AgentOverview agent={details} />}
            {activeTab === "Performance" && <AgentPerformance metrics={metrics} agentId={agentId} />}
            {activeTab === "Logs" && <AgentLogs logs={logs} />}
            {activeTab === "Configuración" && <AgentConfiguration agent={details} agentId={agentId} />}
            {activeTab === "Integraciones" && <AgentIntegrations agentId={agentId} />}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
