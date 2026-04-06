"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, CheckCircle } from "lucide-react";
import { PageTransition, StaggerItem } from "@/components/animations/PageTransition";
import { useToast } from "@/hooks/useToast";
import { generateReport, REPORT_TYPES, ReportType } from "@/app/actions/reports";

export default function ReportsPage() {
  const { addToast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const handleGenerate = async (report: ReportType, format: "csv" | "pdf" | "html") => {
    const key = `${report.id}_${format}`;
    setGenerating(key);
    try {
      const res = await generateReport(report.id, dateRange, format);
      if (res.success) {
        setGenerated((prev) => [...prev, key]);
        addToast(`Reporte "${res.fileName}" generado`, "success");
        // Simulate download
        setTimeout(() => setGenerated((prev) => prev.filter((k) => k !== key)), 3000);
      } else {
        addToast(res.error ?? "Error al generar", "error");
      }
    } finally {
      setGenerating(null);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Reportes</h1>
            <p className="text-gray-600">Genera y descarga reportes exportables de tu plataforma</p>
          </div>
        </StaggerItem>

        {/* Date Range */}
        <StaggerItem>
          <div className="border border-gray-200 rounded-lg p-5 bg-white">
            <h3 className="font-semibold text-gray-900 mb-3">Rango de fechas</h3>
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Desde</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Hasta</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                />
              </div>
            </div>
          </div>
        </StaggerItem>

        {/* Report cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REPORT_TYPES.map((report, i) => (
            <motion.div
              key={report.id}
              className="border border-gray-200 rounded-lg p-6 bg-white space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-4xl">{report.icon}</div>
              <div>
                <h3 className="font-bold text-gray-900">{report.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{report.description}</p>
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
                      className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        isDone
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
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

        {/* Recent downloads (placeholder) */}
        <StaggerItem>
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <h3 className="font-bold text-gray-900 mb-4">Reportes recientes</h3>
            <div className="space-y-3">
              {[
                { name: "usage_2026-03-01_2026-03-31.csv", date: "5 abr 2026", size: "24 KB" },
                { name: "billing_2026-03-01_2026-03-31.pdf", date: "4 abr 2026", size: "156 KB" },
                { name: "performance_2026-02-01_2026-02-28.html", date: "1 mar 2026", size: "48 KB" },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <Download size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{f.name}</p>
                      <p className="text-xs text-gray-500">{f.date} · {f.size}</p>
                    </div>
                  </div>
                  <button className="text-xs text-blue-600 hover:text-blue-700">
                    Descargar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </StaggerItem>
      </div>
    </PageTransition>
  );
}
