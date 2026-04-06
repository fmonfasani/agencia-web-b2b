"use client";

import { AgentLog } from "@/app/actions/agent";
import { CheckCircle, XCircle } from "lucide-react";

interface Props { logs: AgentLog[]; }

export default function AgentLogs({ logs }: Props) {
  if (!logs || logs.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-12 text-center text-gray-500 bg-white">
        No hay logs disponibles
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Últimas {logs.length} Queries</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Query</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Latencia</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Iteraciones</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-700 max-w-xs truncate" title={log.query}>
                  {log.query}
                </td>
                <td className="py-3 px-4 font-mono text-gray-700">{log.latency}ms</td>
                <td className="py-3 px-4 text-gray-700">{log.iterations}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    {log.status === "success" ? (
                      <>
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-green-700 text-xs font-medium">Exitoso</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} className="text-red-600" />
                        <span className="text-red-700 text-xs font-medium">Error</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500 text-xs">
                  {new Date(log.createdAt).toLocaleString("es-AR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
