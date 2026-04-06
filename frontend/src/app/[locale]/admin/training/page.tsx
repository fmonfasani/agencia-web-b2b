import { getAllTenantsTrainingStatus } from "@/app/actions/training";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  FileText,
  Layers,
  ChevronRight,
} from "lucide-react";

export default async function AdminTrainingPage() {
  const tenants = await getAllTenantsTrainingStatus();

  const statusConfig = {
    ready: {
      label: "Listo",
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    empty: {
      label: "Sin datos",
      dot: "bg-amber-400",
      text: "text-amber-700",
      bg: "bg-amber-50",
    },
    error: {
      label: "Error",
      dot: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
    },
  };

  const totalVectors = tenants.reduce((s, t) => s + t.vectorsCount, 0);
  const totalChunks = tenants.reduce((s, t) => s + t.chunksCount, 0);
  const ready = tenants.filter((t) => t.status === "ready").length;
  const pending = tenants.filter((t) => t.status === "empty").length;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Entrenamiento — Panel Analistas
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Supervisá el estado de ingesta de cada cliente. Los documentos subidos
          por los clientes requieren revisión y preprocesamiento antes de
          ingresar al vector store.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Clientes totales
          </p>
          <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Listos
          </p>
          <p className="text-2xl font-bold text-emerald-600">{ready}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Total Vectores
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {totalVectors.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Pendientes
          </p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Database size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">
            Estado por cliente
          </h2>
        </div>

        {tenants.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No hay clientes registrados aún
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1">
                    <FileText size={12} /> Chunks
                  </span>
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1">
                    <Layers size={12} /> Vectores
                  </span>
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Postgres
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Qdrant
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map((t) => {
                const cfg = statusConfig[t.status];
                return (
                  <tr
                    key={t.tenantId}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Nombre */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {t.tenantName}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {t.tenantId.slice(0, 12)}…
                        </p>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                        />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Chunks */}
                    <td className="px-6 py-4 text-right font-mono text-gray-700">
                      {t.chunksCount > 0 ? (
                        t.chunksCount.toLocaleString()
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Vectors */}
                    <td className="px-6 py-4 text-right font-mono text-gray-700">
                      {t.vectorsCount > 0 ? (
                        t.vectorsCount.toLocaleString()
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Postgres */}
                    <td className="px-6 py-4 text-center">
                      {t.postgresOk ? (
                        <CheckCircle2
                          size={16}
                          className="text-emerald-500 mx-auto"
                        />
                      ) : (
                        <AlertCircle
                          size={16}
                          className="text-gray-300 mx-auto"
                        />
                      )}
                    </td>

                    {/* Qdrant */}
                    <td className="px-6 py-4 text-center">
                      {t.qdrantOk ? (
                        <CheckCircle2
                          size={16}
                          className="text-emerald-500 mx-auto"
                        />
                      ) : (
                        <AlertCircle
                          size={16}
                          className="text-gray-300 mx-auto"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Workflow info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Flujo de trabajo del analista
        </h2>
        <div className="flex items-start gap-0">
          {[
            {
              step: "1",
              label: "Cliente sube documentos",
              desc: "PDF, TXT, CSV, DOCX desde su panel",
              color: "bg-blue-500",
            },
            {
              step: "2",
              label: "Revisión y preprocesamiento",
              desc: "El analista limpia, estructura y mejora el contenido",
              color: "bg-amber-500",
            },
            {
              step: "3",
              label: "Ingesta al vector store",
              desc: "Los documentos procesados se cargan en Qdrant",
              color: "bg-purple-500",
            },
            {
              step: "4",
              label: "Agente listo",
              desc: "El agente del cliente responde con la nueva base de conocimiento",
              color: "bg-emerald-500",
            },
          ].map((item, i, arr) => (
            <div key={item.step} className="flex items-start flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                >
                  {item.step}
                </div>
                {i < arr.length - 1 && (
                  <div className="w-px h-0 bg-transparent" />
                )}
              </div>
              <div className="ml-3 flex-1 pb-6">
                <p className="text-sm font-semibold text-gray-800">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              {i < arr.length - 1 && (
                <ChevronRight
                  size={16}
                  className="text-gray-300 mt-2 mx-1 shrink-0"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
