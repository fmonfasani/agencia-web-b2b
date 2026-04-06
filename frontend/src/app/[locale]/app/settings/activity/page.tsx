"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Search } from "lucide-react";
import { PageTransition, StaggerItem } from "@/components/animations/PageTransition";
import { getActivityLog, ActivityLog } from "@/app/actions/reports";

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    getActivityLog().then((data) => { setLogs(data); setLoading(false); });
  }, []);

  const handleFilter = async () => {
    setLoading(true);
    const data = await getActivityLog({
      user: search || undefined,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
    });
    setLogs(data);
    setLoading(false);
  };

  const exportCSV = () => {
    const header = "Fecha,Usuario,Acción,Recurso,Detalles\n";
    const rows = logs.map((l) =>
      `"${new Date(l.date).toLocaleString("es-AR")}","${l.user}","${l.action}","${l.resource}","${l.details ?? ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Activity Log</h1>
              <p className="text-gray-600">Auditoría completa de acciones en la plataforma</p>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download size={16} />
              Exportar CSV
            </button>
          </div>
        </StaggerItem>

        {/* Filters */}
        <StaggerItem>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por usuario..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
            />
            <button onClick={handleFilter}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Filtrar
            </button>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <p className="text-sm text-gray-600">{logs.length} registros</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Fecha</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Usuario</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Acción</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Recurso</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td colSpan={5} className="py-3 px-5">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">No hay registros con esos filtros</td>
                    </tr>
                  ) : (
                    logs.map((log, i) => (
                      <motion.tr
                        key={log.id}
                        className="border-t border-gray-100 hover:bg-gray-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <td className="py-3 px-5 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(log.date).toLocaleString("es-AR")}
                        </td>
                        <td className="py-3 px-5 font-medium text-gray-900">{log.user}</td>
                        <td className="py-3 px-5 text-gray-700">{log.action}</td>
                        <td className="py-3 px-5 text-blue-600">{log.resource}</td>
                        <td className="py-3 px-5 text-gray-500 text-xs">{log.details ?? "—"}</td>
                      </motion.tr>
                    ))
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
