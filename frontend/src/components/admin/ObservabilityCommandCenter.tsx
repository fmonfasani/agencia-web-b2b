"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Database,
  Cpu,
  Zap,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Layers,
  ChevronRight,
  BookOpen,
  FileText,
  Box,
  Circle,
  Server,
  Wifi,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Trace {
  id: string;
  traceId: string;
  service: string;
  operation: string;
  duration: number;
  status: string;
  createdAt: string;
}

interface Metric {
  id: string;
  name: string;
  value: number;
  tags: any;
  createdAt: string;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database: { status: string; message?: string };
    redis: { status: string; message?: string };
    agentService: { status: string; details?: any };
  };
}

interface TrainingMetrics {
  documents: {
    by_status: Record<string, number>;
    total: number;
    ingested: number;
    pending: number;
    rejected: number;
    failed: number;
  };
  quality: { avg_score: number; below_threshold: number; perfect: number };
  chunks: { total: number; avg_tokens_per_chunk: number };
  embeddings: { total: number; models_count: number };
  by_tenant: Array<{
    tenant_id: string;
    total_docs: number;
    ingested: number;
    pending: number;
    chunks: number;
    last_upload?: string;
  }>;
  daily_uploads: Array<{ date: string; count: number }>;
}

interface QdrantStats {
  collections: Array<{
    collection: string;
    vectors_count: number;
    indexed_vectors?: number;
    points_count?: number;
    status: string;
  }>;
  total_collections: number;
}

type Tab = "infrastructure" | "entrenamiento";

const STATUS_PALETTE: Record<string, string> = {
  ingested: "#34C759",
  uploaded: "#007AFF",
  preprocessing: "#FF9F0A",
  reviewing: "#AF52DE",
  embedding: "#FF375F",
  failed: "#FF3B30",
  rejected: "#8E8E93",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-[#34C759]" : "bg-[#FF3B30]"}`}
    />
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent = "#007AFF",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 flex flex-col gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8E8E93]">
          {label}
        </span>
        <span className="text-[#8E8E93]">{icon}</span>
      </div>
      <div>
        <p
          className="text-3xl font-bold tracking-tight"
          style={{ color: accent }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && (
          <p className="text-xs text-[#8E8E93] mt-1 font-medium">{sub}</p>
        )}
      </div>
    </div>
  );
}

function ServiceRow({ label, status }: { label: string; status: string }) {
  const ok = status === "connected" || status === "ok";
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F2F2F7] last:border-0">
      <span className="text-sm font-medium text-[#1C1C1E]">{label}</span>
      <div className="flex items-center gap-2">
        <StatusDot ok={ok} />
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${ok ? "text-[#34C759]" : "text-[#FF3B30]"}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

const chartTooltipStyle = {
  background: "#fff",
  border: "1px solid #E5E5EA",
  borderRadius: 10,
  boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
  color: "#1C1C1E",
  fontSize: 12,
  fontWeight: 600,
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ObservabilityCommandCenter() {
  const [activeTab, setActiveTab] = useState<Tab>("infrastructure");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [trainingMetrics, setTrainingMetrics] =
    useState<TrainingMetrics | null>(null);
  const [qdrantStats, setQdrantStats] = useState<QdrantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [hRes, tRes, mRes, trRes] = await Promise.all([
        fetch("/api/observability/health"),
        fetch("/api/observability/traces"),
        fetch("/api/observability/metrics"),
        fetch("/api/training/metrics"),
      ]);
      if (hRes.ok) setHealth(await hRes.json());
      if (tRes.ok) {
        const d = await tRes.json();
        setTraces(d.traces || []);
      }
      if (mRes.ok) {
        const d = await mRes.json();
        setMetrics(d.metrics || []);
      }
      if (trRes.ok) {
        const d = await trRes.json();
        setTrainingMetrics(d.metrics);
        setQdrantStats(d.qdrant);
      }
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F2F7]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={32} className="animate-spin text-[#007AFF]" />
          <p className="text-sm font-semibold text-[#8E8E93]">
            Cargando datos…
          </p>
        </div>
      </div>
    );
  }

  const systemOk = health?.status === "ok";
  const statusBarData = trainingMetrics
    ? Object.entries(trainingMetrics.documents.by_status).map(([s, c]) => ({
        name: s,
        count: c,
        fill: STATUS_PALETTE[s] ?? "#8E8E93",
      }))
    : [];
  const dailyData = trainingMetrics?.daily_uploads ?? [];

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display',system-ui,sans-serif]">
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#E5E5EA] sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1C1C1E] tracking-tight">
              Observabilidad
            </h1>
            <p className="text-xs text-[#8E8E93] mt-0.5 font-medium">
              {lastUpdated
                ? `Actualizado a las ${lastUpdated.toLocaleTimeString()}`
                : "Sincronizando…"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status pill */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
                systemOk
                  ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]"
                  : "bg-[#FFF1F2] border-[#FECDD3] text-[#DC2626]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${systemOk ? "bg-[#34C759] animate-pulse" : "bg-[#FF3B30]"}`}
              />
              {systemOk ? "Todos los sistemas operativos" : "Degradado"}
            </div>

            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-xs font-semibold text-[#3A3A3C] transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={isRefreshing ? "animate-spin" : ""}
              />
              Actualizar
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="max-w-[1400px] mx-auto px-8 pb-0 flex gap-0">
          {(
            [
              {
                id: "infrastructure",
                label: "Infraestructura",
                icon: <Server size={14} />,
              },
              {
                id: "entrenamiento",
                label: "Entrenamiento IA",
                icon: <BookOpen size={14} />,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-[#007AFF] text-[#007AFF]"
                  : "border-transparent text-[#8E8E93] hover:text-[#3A3A3C]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-6">
        {/* ── INFRAESTRUCTURA ── */}
        {activeTab === "infrastructure" && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Estado sistema"
                value={systemOk ? "Operativo" : "Degradado"}
                sub="Salud global de servicios"
                accent={systemOk ? "#34C759" : "#FF3B30"}
                icon={<Shield size={16} />}
              />
              <KpiCard
                label="Base de datos"
                value={health?.services.database.status ?? "—"}
                sub="PostgreSQL principal"
                accent={
                  health?.services.database.status === "connected"
                    ? "#34C759"
                    : "#FF3B30"
                }
                icon={<Database size={16} />}
              />
              <KpiCard
                label="Agent Service"
                value={health?.services.agentService.status ?? "—"}
                sub="backend-agents:8001"
                accent={
                  health?.services.agentService.status === "connected"
                    ? "#34C759"
                    : "#FF3B30"
                }
                icon={<Cpu size={16} />}
              />
              <KpiCard
                label="Trazas registradas"
                value={traces.length}
                sub="Últimas 50 operaciones"
                accent="#007AFF"
                icon={<Activity size={16} />}
              />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Trace table */}
              <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#F2F2F7] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#1C1C1E]">
                      Distributed Tracing
                    </h2>
                    <p className="text-xs text-[#8E8E93] mt-0.5">
                      Últimas operaciones registradas
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#34C759] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-full">
                    Live
                  </span>
                </div>
                <div className="overflow-auto max-h-[480px]">
                  {traces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Activity size={28} className="text-[#C7C7CC]" />
                      <p className="text-sm text-[#8E8E93] font-medium">
                        No hay trazas disponibles
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-[#F9F9FB] sticky top-0">
                        <tr>
                          {[
                            "Trace ID",
                            "Servicio",
                            "Operación",
                            "Duración",
                            "Estado",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {traces.map((trace) => (
                          <tr
                            key={trace.id}
                            className="border-t border-[#F2F2F7] hover:bg-[#F9F9FB] transition-colors"
                          >
                            <td className="px-5 py-3.5 font-mono text-xs text-[#007AFF]">
                              {trace.traceId.slice(0, 8)}…
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                                  trace.service.includes("frontend")
                                    ? "bg-[#F3E8FF] text-[#7C3AED]"
                                    : "bg-[#FFF7ED] text-[#C2410C]"
                                }`}
                              >
                                {trace.service.includes("frontend")
                                  ? "Frontend"
                                  : "Agents"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-[#1C1C1E] font-medium max-w-[200px] truncate">
                              {trace.operation}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`text-xs font-bold tabular-nums ${
                                  trace.duration > 2000
                                    ? "text-[#FF3B30]"
                                    : trace.duration > 800
                                      ? "text-[#FF9F0A]"
                                      : "text-[#34C759]"
                                }`}
                              >
                                {trace.duration}ms
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <StatusDot ok={trace.status === "ok"} />
                                <span className="text-xs font-semibold text-[#3A3A3C] uppercase tracking-wide">
                                  {trace.status}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Side panel */}
              <div className="space-y-4">
                {/* Services health */}
                <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                  <h3 className="text-sm font-bold text-[#1C1C1E] mb-4">
                    Estado de Servicios
                  </h3>
                  <ServiceRow
                    label="PostgreSQL"
                    status={health?.services.database.status ?? "unknown"}
                  />
                  <ServiceRow
                    label="Redis"
                    status={health?.services.redis?.status ?? "unknown"}
                  />
                  <ServiceRow
                    label="Agent Service"
                    status={health?.services.agentService.status ?? "unknown"}
                  />
                </div>

                {/* Metrics */}
                <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                  <h3 className="text-sm font-bold text-[#1C1C1E] mb-4">
                    Métricas Recientes
                  </h3>
                  {metrics.length === 0 ? (
                    <p className="text-xs text-[#8E8E93] font-medium text-center py-4">
                      Sin métricas
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {metrics.slice(0, 6).map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2 border-b border-[#F2F2F7] last:border-0"
                        >
                          <span className="text-xs font-medium text-[#3A3A3C] truncate max-w-[130px]">
                            {m.name}
                          </span>
                          <span className="text-xs font-bold text-[#007AFF] tabular-nums">
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── ENTRENAMIENTO ── */}
        {activeTab === "entrenamiento" && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  label: "Ingestados",
                  value: trainingMetrics?.documents.ingested ?? 0,
                  accent: "#34C759",
                  icon: <CheckCircle2 size={16} />,
                  sub: "documentos listos",
                },
                {
                  label: "Pendientes",
                  value: trainingMetrics?.documents.pending ?? 0,
                  accent: "#FF9F0A",
                  icon: <Clock size={16} />,
                  sub: "esperando revisión",
                },
                {
                  label: "Fallidos",
                  value: trainingMetrics?.documents.failed ?? 0,
                  accent: "#FF3B30",
                  icon: <AlertCircle size={16} />,
                  sub: "requieren atención",
                },
                {
                  label: "Chunks",
                  value: trainingMetrics?.chunks.total ?? 0,
                  accent: "#007AFF",
                  icon: <FileText size={16} />,
                  sub: `~${trainingMetrics?.chunks.avg_tokens_per_chunk.toFixed(0) ?? 0} tokens/chunk`,
                },
                {
                  label: "Vectores",
                  value: trainingMetrics?.embeddings.total ?? 0,
                  accent: "#AF52DE",
                  icon: <Box size={16} />,
                  sub: "en Qdrant",
                },
              ].map((k, i) => (
                <KpiCard key={i} {...k} />
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Docs por estado */}
              <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-[#1C1C1E]">
                    Documentos por Estado
                  </h3>
                  <p className="text-xs text-[#8E8E93] mt-0.5">
                    Distribución actual del pipeline
                  </p>
                </div>
                {statusBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={statusBarData}
                      barSize={32}
                      barCategoryGap="30%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#F2F2F7"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: "#8E8E93",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#8E8E93", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        cursor={{ fill: "rgba(0,0,0,0.03)" }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {statusBarData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-2">
                    <BarChart3 size={24} className="text-[#C7C7CC]" />
                    <p className="text-sm text-[#8E8E93] font-medium">
                      Sin documentos aún
                    </p>
                  </div>
                )}
              </div>

              {/* Daily uploads */}
              <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-[#1C1C1E]">
                    Uploads — Últimos 7 días
                  </h3>
                  <p className="text-xs text-[#8E8E93] mt-0.5">
                    Actividad de carga de documentos
                  </p>
                </div>
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient
                          id="uploadGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#007AFF"
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="95%"
                            stopColor="#007AFF"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#F2F2F7"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: "#8E8E93",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis
                        tick={{ fill: "#8E8E93", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#007AFF"
                        strokeWidth={2}
                        fill="url(#uploadGrad)"
                        dot={{ fill: "#007AFF", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-2">
                    <TrendingUp size={24} className="text-[#C7C7CC]" />
                    <p className="text-sm text-[#8E8E93] font-medium">
                      Sin actividad reciente
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quality + Qdrant */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Quality */}
              <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-[#1C1C1E]">
                    Calidad de Documentos
                  </h3>
                  <p className="text-xs text-[#8E8E93] mt-0.5">
                    Score promedio del pipeline
                  </p>
                </div>
                {trainingMetrics ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs font-semibold text-[#3A3A3C]">
                          Score promedio
                        </span>
                        <span className="text-xs font-bold text-[#007AFF]">
                          {(trainingMetrics.quality.avg_score * 100).toFixed(0)}
                          %
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#007AFF] rounded-full transition-all duration-700"
                          style={{
                            width: `${trainingMetrics.quality.avg_score * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-[#DC2626]">
                          {trainingMetrics.quality.below_threshold}
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#DC2626]/70 mt-1">
                          Bajo umbral
                        </p>
                      </div>
                      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-[#16A34A]">
                          {trainingMetrics.quality.perfect}
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#16A34A]/70 mt-1">
                          Perfectos
                        </p>
                      </div>
                    </div>
                    <div className="bg-[#F9F9FB] rounded-xl p-3">
                      <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">
                        Promedio tokens/chunk
                      </p>
                      <p className="text-xl font-bold text-[#1C1C1E] mt-1">
                        {trainingMetrics.chunks.avg_tokens_per_chunk.toFixed(0)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#8E8E93] font-medium">
                    Sin datos
                  </p>
                )}
              </div>

              {/* Qdrant */}
              <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#F2F2F7] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1E]">
                      Qdrant Collections
                    </h3>
                    <p className="text-xs text-[#8E8E93] mt-0.5">
                      Vector store por tenant
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#8E8E93]">
                    {qdrantStats?.total_collections ?? 0} colecciones
                  </span>
                </div>
                {qdrantStats && qdrantStats.collections.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-[#F9F9FB]">
                      <tr>
                        {["Colección", "Vectores", "Puntos", "Estado"].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {qdrantStats.collections.map((col, i) => {
                        const ok =
                          col.status.toLowerCase().includes("green") ||
                          col.status === "CollectionStatus.GREEN";
                        return (
                          <tr
                            key={i}
                            className="border-t border-[#F2F2F7] hover:bg-[#F9F9FB] transition-colors"
                          >
                            <td className="px-5 py-3.5 font-mono text-xs text-[#007AFF]">
                              {col.collection}
                            </td>
                            <td className="px-5 py-3.5 text-sm font-bold text-[#1C1C1E] tabular-nums">
                              {col.vectors_count.toLocaleString()}
                            </td>
                            <td className="px-5 py-3.5 text-xs font-medium text-[#8E8E93] tabular-nums">
                              {(col.points_count ?? 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <StatusDot ok={ok} />
                                <span className="text-xs font-semibold text-[#3A3A3C]">
                                  {col.status.replace("CollectionStatus.", "")}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Database size={24} className="text-[#C7C7CC]" />
                    <p className="text-sm text-[#8E8E93] font-medium">
                      No hay colecciones en Qdrant
                    </p>
                    <p className="text-xs text-[#C7C7CC]">
                      Ingestá un documento para crear la primera colección
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Per-tenant table */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F2F2F7]">
                <h3 className="text-sm font-bold text-[#1C1C1E]">
                  Entrenamiento por Cliente
                </h3>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Actividad de documentos por tenant
                </p>
              </div>
              {trainingMetrics && trainingMetrics.by_tenant.length > 0 ? (
                <div className="overflow-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#F9F9FB]">
                      <tr>
                        {[
                          "Tenant ID",
                          "Total docs",
                          "Ingestados",
                          "Pendientes",
                          "Chunks",
                          "Último upload",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trainingMetrics.by_tenant.map((t, i) => (
                        <tr
                          key={i}
                          className="border-t border-[#F2F2F7] hover:bg-[#F9F9FB] transition-colors"
                        >
                          <td className="px-5 py-3.5 font-mono text-xs text-[#007AFF]">
                            {t.tenant_id.slice(0, 12)}…
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold text-[#1C1C1E]">
                            {t.total_docs}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm font-bold text-[#34C759]">
                              {t.ingested}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`text-sm font-bold ${t.pending > 0 ? "text-[#FF9F0A]" : "text-[#C7C7CC]"}`}
                            >
                              {t.pending}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-medium text-[#3A3A3C] tabular-nums">
                            {t.chunks.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-medium text-[#8E8E93]">
                            {t.last_upload
                              ? new Date(t.last_upload).toLocaleDateString(
                                  "es-AR",
                                )
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Layers size={24} className="text-[#C7C7CC]" />
                  <p className="text-sm text-[#8E8E93] font-medium">
                    Sin datos por cliente
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
