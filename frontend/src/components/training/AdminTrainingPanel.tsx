"use client";

import { useState, useTransition } from "react";
import {
  updateDocumentContent,
  ingestDocument,
  rejectDocument,
  getDocumentDetail,
  getPendingDocuments,
} from "@/app/actions/training";
import type {
  TrainingDocument,
  TrainingDocumentDetail,
  TrainingDocStatus,
} from "@/lib/saas-client";
import {
  FileText,
  X,
  Save,
  Zap,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit3,
  Settings,
} from "lucide-react";

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
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
  const cfg = STATUS_CFG[status] ?? {
    label: status,
    color: "text-gray-700",
    bg: "bg-gray-50",
    dot: "bg-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function QualityBadge({ score }: { score?: number }) {
  if (score == null) return <span className="text-gray-300 text-xs">—</span>;
  const pct = Math.round(score * 100);
  const color =
    score >= 0.7
      ? "text-emerald-700 bg-emerald-50"
      : score >= 0.4
        ? "text-amber-700 bg-amber-50"
        : "text-red-700 bg-red-50";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {pct}%
    </span>
  );
}

// ── Document editor modal ─────────────────────────────────────────────────────

function DocumentEditor({
  doc,
  onClose,
  onRefresh,
}: {
  doc: TrainingDocumentDetail;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"original" | "processed" | "config">(
    "processed",
  );
  const [contentProcessed, setContentProcessed] = useState(
    doc.content_processed ?? doc.content_raw ?? "",
  );
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [chunkStrategy, setChunkStrategy] = useState<string>(
    (doc.chunk_config as any)?.strategy ?? "hybrid",
  );
  const [chunkSize, setChunkSize] = useState<number>(
    (doc.chunk_config as any)?.chunk_size ?? 512,
  );
  const [chunkOverlap, setChunkOverlap] = useState<number>(
    (doc.chunk_config as any)?.overlap ?? 64,
  );
  const [feedback, setFeedback] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateDocumentContent(
        doc.id,
        contentProcessed,
        doc.metadata,
        {
          strategy: chunkStrategy,
          chunk_size: chunkSize,
          overlap: chunkOverlap,
        },
      );
      setFeedback(
        res.success ? "Guardado correctamente" : `Error: ${res.error}`,
      );
      setTimeout(() => setFeedback(""), 3000);
    });
  };

  const handleIngest = () => {
    startTransition(async () => {
      const res = await ingestDocument(doc.id, {
        strategy: chunkStrategy,
        chunk_size: chunkSize,
        overlap: chunkOverlap,
      });
      if (res.success) {
        setFeedback(`Ingestado: ${res.chunks} chunks, ${res.vectors} vectores`);
        setTimeout(() => {
          setFeedback("");
          onRefresh();
          onClose();
        }, 2500);
      } else {
        setFeedback(`Error: ${res.error}`);
        setTimeout(() => setFeedback(""), 4000);
      }
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    startTransition(async () => {
      const res = await rejectDocument(doc.id, rejectReason);
      if (res.success) {
        onRefresh();
        onClose();
      } else {
        setFeedback(`Error: ${res.error}`);
        setTimeout(() => setFeedback(""), 4000);
      }
    });
  };

  const isIngested = doc.status === "ingested";
  const isRejected = doc.status === "rejected";
  const lowQuality = doc.quality_score != null && doc.quality_score < 0.4;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-gray-400" />
              <h2 className="font-semibold text-gray-900 max-w-sm truncate">
                {doc.filename}
              </h2>
              <StatusBadge status={doc.status} />
              <QualityBadge score={doc.quality_score} />
            </div>
            {doc.rejection_reason && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                <XCircle size={11} /> Rechazado: {doc.rejection_reason}
              </p>
            )}
            {doc.quality_issues.length > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} /> {doc.quality_issues.join(", ")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(["processed", "original", "config"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "processed" && <Edit3 size={13} />}
              {t === "original" && <Eye size={13} />}
              {t === "config" && <Settings size={13} />}
              {t === "processed"
                ? "Procesado"
                : t === "original"
                  ? "Original"
                  : "Configuración"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {tab === "original" && (
            <textarea
              readOnly
              value={doc.content_raw ?? ""}
              className="w-full h-80 font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none text-gray-700"
            />
          )}

          {tab === "processed" && (
            <textarea
              value={contentProcessed}
              onChange={(e) => setContentProcessed(e.target.value)}
              disabled={isIngested || isRejected || isPending}
              placeholder="Editá el contenido procesado aquí..."
              className="w-full h-80 font-mono text-xs border border-gray-200 rounded-lg p-3 resize-none text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          )}

          {tab === "config" && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estrategia de chunking
                </label>
                <div className="flex gap-3">
                  {(["hybrid", "fixed"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setChunkStrategy(s)}
                      disabled={isIngested || isRejected}
                      className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                        chunkStrategy === s
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      } disabled:opacity-50`}
                    >
                      {s === "hybrid"
                        ? "Híbrida (recomendado)"
                        : "Fija (por tamaño)"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {chunkStrategy === "hybrid"
                    ? "Divide por párrafos/secciones, luego por tamaño si es necesario."
                    : "Divide por número fijo de caracteres con overlap."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tamaño de chunk (chars)
                  </label>
                  <input
                    type="number"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    disabled={isIngested || isRejected}
                    min={128}
                    max={2048}
                    step={64}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Overlap (chars)
                  </label>
                  <input
                    type="number"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                    disabled={isIngested || isRejected}
                    min={0}
                    max={256}
                    step={16}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mx-6 mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
              feedback.startsWith("Error")
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback}
          </div>
        )}

        {/* Actions */}
        {!isIngested && !isRejected && (
          <div className="px-6 pb-6 flex items-center justify-between">
            <div className="flex gap-2">
              {!showRejectForm ? (
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50 transition-colors"
                >
                  <XCircle size={14} /> Rechazar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Motivo del rechazo..."
                    className="border border-rose-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    onKeyDown={(e) => e.key === "Enter" && handleReject()}
                  />
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || isPending}
                    className="px-3 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-rose-700"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason("");
                    }}
                    className="px-3 py-2 text-gray-500 rounded-lg text-sm hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isPending || tab === "original"}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Save size={14} /> Guardar borrador
              </button>
              <button
                onClick={handleIngest}
                disabled={isPending || lowQuality}
                title={
                  lowQuality
                    ? `Quality score demasiado bajo (${Math.round((doc.quality_score ?? 0) * 100)}%)`
                    : ""
                }
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Zap size={14} /> {isPending ? "Ingestando..." : "Ingestar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function AdminTrainingPanel({
  initialDocuments,
}: {
  initialDocuments: TrainingDocument[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selected, setSelected] = useState<TrainingDocumentDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "ingested" | "rejected"
  >("pending");

  const filtered = documents.filter((d) => {
    if (filter === "pending")
      return !["ingested", "rejected"].includes(d.status);
    if (filter === "ingested") return d.status === "ingested";
    if (filter === "rejected") return d.status === "rejected";
    return true;
  });

  const pendingCount = documents.filter(
    (d) => !["ingested", "rejected"].includes(d.status),
  ).length;

  const openDocument = async (docId: string) => {
    setLoadingId(docId);
    try {
      const detail = await getDocumentDetail(docId);
      if (detail) setSelected(detail);
    } finally {
      setLoadingId(null);
    }
  };

  const refresh = async () => {
    const docs = await getPendingDocuments();
    setDocuments(docs.length > 0 ? docs : initialDocuments);
    setSelected(null);
  };

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        {(["pending", "all", "ingested", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {f === "pending"
              ? `Pendientes (${pendingCount})`
              : f === "all"
                ? "Todos"
                : f === "ingested"
                  ? "Ingestados"
                  : "Rechazados"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">
              No hay documentos en esta categoría
            </p>
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
                    Cliente
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Calidad
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Subido
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 max-w-[220px] truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-400 uppercase mt-0.5">
                        {doc.file_type}
                      </p>
                      {doc.rejection_reason && (
                        <p className="text-xs text-rose-500 mt-1 truncate max-w-[220px]">
                          {doc.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-xs text-gray-400">
                        {(doc.tenant_id ?? "—").slice(0, 14)}…
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-6 py-4">
                      <QualityBadge score={doc.quality_score} />
                      {doc.quality_issues?.length > 0 && (
                        <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> {doc.quality_issues[0]}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs whitespace-nowrap">
                      {doc.uploaded_at
                        ? new Date(doc.uploaded_at).toLocaleDateString(
                            "es-AR",
                            {
                              day: "2-digit",
                              month: "short",
                            },
                          )
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDocument(doc.id)}
                        disabled={loadingId === doc.id}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                      >
                        {loadingId === doc.id ? (
                          "Cargando..."
                        ) : (
                          <>
                            <Edit3 size={12} /> Revisar
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor modal */}
      {selected && (
        <DocumentEditor
          doc={selected}
          onClose={() => setSelected(null)}
          onRefresh={refresh}
        />
      )}
    </>
  );
}
