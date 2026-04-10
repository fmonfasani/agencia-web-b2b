"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Loader2,
  CheckCircle,
  TrendingUp,
  Zap,
  Clock,
  BarChart2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  PageTransition,
  StaggerItem,
} from "@/components/animations/PageTransition";
import { useToast } from "@/hooks/useToast";
import {
  generateReport,
  getUsageReport,
  getPerformanceReport,
  ReportType,
} from "@/app/actions/reports";
import type {
  ReportsUsageResponse,
  ReportsPerformanceResponse,
} from "@/lib/saas-client";

const REPORT_TYPES: ReportType[] = [
  {
    id: "usage",
    name: "Reporte de Uso",
    description:
      "Queries procesadas, costos y errores por agente en el período",
    formats: ["csv", "pdf"],
    icon: "📊",
  },
  {
    id: "billing",
    name: "Reporte de Facturación",
    description: "Desglose de suscripciones, pagos e impuestos",
    formats: ["pdf"],
    icon: "💳",
  },
  {
    id: "performance",
    name: "Reporte de Performance",
    description: "KPIs principales, latencia, tasa de éxito y comparativa",
    formats: ["csv", "html"],
    icon: "⚡",
  },
];

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "#007AFF",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + "1A" }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[#8E8E93] font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[#1C1C1E] leading-none">
          {value}
        </p>
        {sub && <p className="text-xs text-[#8E8E93] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { addToast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const [usage, setUsage] = useState<ReportsUsageResponse | null>(null);
  const [perf, setPerf] = useState<ReportsPerformanceResponse | null>(null);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    setChartsLoading(true);
    Promise.all([
      getUsageReport({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
      getPerformanceReport({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
    ]).then(([u, p]) => {
      setUsage(u);
      setPerf(p);
      setChartsLoading(false);
    });
  }, [dateRange.startDate, dateRange.endDate]);

  const handleGenerate = async (
    report: ReportType,
    format: "csv" | "pdf" | "html",
  ) => {
    const key = `${report.id}_${format}`;
    setGenerating(key);
    try {
      const res = await generateReport(report.id, dateRange, format);
      if (res.success) {
        setGenerated((prev) => [...prev, key]);
        if (res.downloadUrl) {
          // Trigger actual download for CSV
          const a = document.createElement("a");
          a.href = res.downloadUrl;
          a.download = res.fileName ?? `${report.id}.${format}`;
          a.click();
          addToast(`Descargando ${res.fileName}`, "success");
        } else {
          addToast(`Reporte "${res.fileName}" generado`, "success");
        }
        setTimeout(
          () => setGenerated((prev) => prev.filter((k) => k !== key)),
          3000,
        );
      } else {
        addToast(res.error ?? "Error al generar", "error");
      }
    } finally {
      setGenerating(null);
    }
  };

  // Prepare chart data
  const dailyData =
    usage?.daily_stats?.map((d) => ({
      date: d.date.slice(5), // MM-DD
      queries: d.total_queries,
      errors: d.failed_queries,
    })) ?? [];

  const perfKpis = perf
    ? [
        {
          label: "Queries Totales",
          value: perf.total_queries.toLocaleString(),
          icon: TrendingUp,
          color: "#007AFF",
        },
        {
          label: "Tasa de Éxito",
          value: `${(perf.success_rate * 100).toFixed(1)}%`,
          icon: CheckCircle,
          color: "#34C759",
        },
        {
          label: "Latencia p50",
          value: `${perf.p50_latency_ms}ms`,
          icon: Clock,
          color: "#FF9500",
        },
        {
          label: "Latencia p95",
          value: `${perf.p95_latency_ms}ms`,
          icon: Zap,
          color: "#FF3B30",
        },
      ]
    : [];

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div>
            <h1 className="text-3xl font-bold text-[#1C1C1E] mb-1">Reportes</h1>
            <p className="text-[#8E8E93]">
              Analiza el rendimiento y descarga reportes exportables
            </p>
          </div>
        </StaggerItem>

        {/* Date Range */}
        <StaggerItem>
          <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5">
            <h3 className="font-semibold text-[#1C1C1E] mb-3 text-sm">
              Rango de fechas
            </h3>
            <div className="flex gap-4 flex-wrap items-end">
              <div>
                <label className="text-xs text-[#8E8E93] block mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[#8E8E93] block mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] text-sm"
                />
              </div>
              {chartsLoading && (
                <div className="flex items-center gap-2 text-[#8E8E93] text-sm pb-2">
                  <Loader2 size={14} className="animate-spin" />
                  Cargando datos...
                </div>
              )}
            </div>
          </div>
        </StaggerItem>

        {/* KPIs */}
        {!chartsLoading && perfKpis.length > 0 && (
          <StaggerItem>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {perfKpis.map((k) => (
                <KpiCard key={k.label} {...k} />
              ))}
            </div>
          </StaggerItem>
        )}

        {/* Charts */}
        {!chartsLoading && dailyData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Queries over time */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5">
              <h3 className="font-semibold text-[#1C1C1E] text-sm mb-4 flex items-center gap-2">
                <BarChart2 size={16} className="text-[#007AFF]" />
                Queries por día
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#007AFF"
                        stopOpacity={0.15}
                      />
                      <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#8E8E93" }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#8E8E93" }} width={32} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E5E5EA",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="queries"
                    stroke="#007AFF"
                    strokeWidth={2}
                    fill="url(#qGrad)"
                    name="Queries"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Errors */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5">
              <h3 className="font-semibold text-[#1C1C1E] text-sm mb-4 flex items-center gap-2">
                <Zap size={16} className="text-[#FF3B30]" />
                Errores por día
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#8E8E93" }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#8E8E93" }} width={32} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E5E5EA",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="errors"
                    fill="#FF3B30"
                    radius={[4, 4, 0, 0]}
                    name="Errores"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Empty state for charts */}
        {!chartsLoading && dailyData.length === 0 && (
          <div className="bg-[#F9F9FB] rounded-2xl border border-[#E5E5EA] p-10 text-center">
            <BarChart2 size={32} className="mx-auto mb-3 text-[#C7C7CC]" />
            <p className="text-sm text-[#8E8E93] font-medium">
              Sin datos en el rango seleccionado
            </p>
          </div>
        )}

        {/* Report cards */}
        <StaggerItem>
          <h2 className="text-lg font-bold text-[#1C1C1E]">
            Exportar reportes
          </h2>
        </StaggerItem>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REPORT_TYPES.map((report, i) => (
            <motion.div
              key={report.id}
              className="bg-white border border-[#E5E5EA] rounded-2xl p-6 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-4xl">{report.icon}</div>
              <div>
                <h3 className="font-bold text-[#1C1C1E]">{report.name}</h3>
                <p className="text-sm text-[#8E8E93] mt-1">
                  {report.description}
                </p>
              </div>

              <div className="space-y-2">
                {report.formats.map((fmt) => {
                  const key = `${report.id}_${fmt}`;
                  const isGenerating = generating === key;
                  const isDone = generated.includes(key);

                  return (
                    <button
                      key={fmt}
                      onClick={() => handleGenerate(report, fmt)}
                      disabled={!!generating}
                      className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                        isDone
                          ? "bg-[#F0FFF4] text-[#34C759] border border-[#34C759]/30"
                          : "bg-[#F9F9FB] text-[#1C1C1E] border border-[#E5E5EA] hover:bg-[#F2F2F7]"
                      }`}
                    >
                      {isGenerating ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : isDone ? (
                        <CheckCircle size={16} />
                      ) : (
                        <Download size={16} />
                      )}
                      {isGenerating
                        ? "Generando..."
                        : isDone
                          ? "Descargado"
                          : `Descargar ${fmt.toUpperCase()}`}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
