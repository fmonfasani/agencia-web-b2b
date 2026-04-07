import { getMyDocuments, getMyTrainingSummary } from "@/app/actions/training";
import TrainingUpload from "@/components/training/TrainingUpload";
import type { TrainingDocument, TrainingDocStatus } from "@/lib/saas-client";
import { FileText, Clock, XCircle, AlertTriangle } from "lucide-react";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TrainingDocStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  uploaded: {
    label: "Subido",
    color: "text-blue-700",
    bg: "bg-blue-50",
    dot: "bg-blue-400",
  },
  preprocessing: {
    label: "Preprocesando",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    dot: "bg-indigo-400",
  },
  extracted: {
    label: "Extraído",
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    dot: "bg-cyan-400",
  },
  reviewing: {
    label: "En revisión",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-400",
  },
  approved: {
    label: "Aprobado",
    color: "text-teal-700",
    bg: "bg-teal-50",
    dot: "bg-teal-500",
  },
  chunking: {
    label: "Chunkeando",
    color: "text-violet-700",
    bg: "bg-violet-50",
    dot: "bg-violet-400",
  },
  embedding: {
    label: "Embeddiendo",
    color: "text-purple-700",
    bg: "bg-purple-50",
    dot: "bg-purple-400",
  },
  ingested: {
    label: "Ingestado",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "Error",
    color: "text-red-700",
    bg: "bg-red-50",
    dot: "bg-red-500",
  },
  rejected: {
    label: "Rechazado",
    color: "text-rose-700",
    bg: "bg-rose-50",
    dot: "bg-rose-500",
  },
};

function StatusBadge({ status }: { status: TrainingDocStatus }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-gray-700",
    bg: "bg-gray-50",
    dot: "bg-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function QualityBar({ score }: { score?: number }) {
  if (score == null) return <span className="text-gray-300 text-xs">—</span>;
  const pct = Math.round(score * 100);
  const color =
    score >= 0.7
      ? "bg-emerald-500"
      : score >= 0.4
        ? "bg-amber-400"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 tabular-nums">{pct}%</span>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TrainingPage() {
  const [documents, summary] = await Promise.all([
    getMyDocuments(),
    getMyTrainingSummary(),
  ]);

  const ingested = documents.filter((d) => d.status === "ingested").length;
  const pending = documents.filter(
    (d) => !["ingested", "rejected"].includes(d.status),
  ).length;
  const rejected = documents.filter((d) => d.status === "rejected").length;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Entrenamiento</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Subí los documentos de tu empresa. El equipo de Webshooks los revisa,
          mejora e ingesta en tu agente IA.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Total subidos
          </p>
          <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Ingestados
          </p>
          <p className="text-2xl font-bold text-emerald-600">{ingested}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            En proceso
          </p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Vectores activos
          </p>
          <p className="text-2xl font-bold text-purple-600">
            {summary?.total_embeddings.toLocaleString() ?? "—"}
          </p>
        </div>
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Subir documentos
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Formatos aceptados: PDF, TXT, CSV, DOCX. Máximo 20 MB por archivo.
        </p>
        <TrainingUpload />
      </div>

      {/* Documents table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">
            Mis documentos
          </h2>
          {documents.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">
              {documents.length} archivos
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">Aún no subiste documentos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Archivo
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Calidad
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tamaño
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Subido
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 max-w-[240px] truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-400 uppercase mt-0.5">
                        {doc.file_type}
                      </p>
                      {doc.status === "rejected" && doc.rejection_reason && (
                        <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                          <XCircle size={11} /> {doc.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-6 py-4">
                      <QualityBar score={doc.quality_score} />
                      {doc.quality_issues.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> {doc.quality_issues[0]}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 tabular-nums text-xs">
                      {formatBytes(doc.file_size_bytes)}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs tabular-nums whitespace-nowrap">
                      {doc.uploaded_at
                        ? new Date(doc.uploaded_at).toLocaleDateString(
                            "es-AR",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 flex gap-4">
        <Clock size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">
            ¿Qué pasa después de subir?
          </p>
          <p className="text-sm text-blue-700 mt-1">
            El equipo de Webshooks revisa, mejora y preprocesa tus documentos
            antes de ingresarlos al agente IA. Este proceso garantiza que tu
            agente responda con precisión y relevancia.
          </p>
        </div>
      </div>
    </div>
  );
}
