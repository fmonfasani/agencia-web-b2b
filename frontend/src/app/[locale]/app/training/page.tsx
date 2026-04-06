import { getTrainingStatus } from "@/app/actions/training";
import TrainingUpload from "@/components/training/TrainingUpload";
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Layers,
} from "lucide-react";

export default async function TrainingPage() {
  const status = await getTrainingStatus();

  const statusConfig = {
    ready: {
      label: "Listo",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
    },
    empty: {
      label: "Sin datos",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: Clock,
      iconColor: "text-amber-500",
    },
    error: {
      label: "Error",
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      icon: AlertCircle,
      iconColor: "text-red-500",
    },
  };

  const cfg = statusConfig[status.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Entrenamiento</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Subí los documentos de tu empresa para entrenar tu agente IA. El
          equipo de Webshooks los procesará y mejorará antes de la ingesta.
        </p>
      </div>

      {/* Estado actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estado general */}
        <div className={`rounded-xl border p-5 ${cfg.bg} ${cfg.border}`}>
          <div className="flex items-center gap-3 mb-3">
            <StatusIcon size={20} className={cfg.iconColor} />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Estado
            </span>
          </div>
          <p className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</p>
          <p className="text-xs text-gray-500 mt-1">{status.tenantName}</p>
        </div>

        {/* Chunks */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <FileText size={20} className="text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Fragmentos
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {status.chunksCount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Chunks procesados en base de datos
          </p>
        </div>

        {/* Vectors */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <Layers size={20} className="text-purple-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Vectores
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {status.vectorsCount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Embeddings en Qdrant</p>
        </div>
      </div>

      {/* Infraestructura */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">
            Infraestructura
          </h2>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${status.postgresOk ? "bg-emerald-500" : "bg-gray-300"}`}
            />
            <span className="text-sm text-gray-600">PostgreSQL</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${status.qdrantOk ? "bg-emerald-500" : "bg-gray-300"}`}
            />
            <span className="text-sm text-gray-600">Qdrant (Vector DB)</span>
          </div>
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

      {/* Info */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 flex gap-4">
        <Clock size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">
            ¿Qué pasa después de subir?
          </p>
          <p className="text-sm text-blue-700 mt-1">
            El equipo de Webshooks revisa, mejora y preprocesa tus documentos
            antes de ingresarlos al agente IA. Este proceso garantiza que tu
            agente responda con precisión. Te notificaremos cuando esté listo.
          </p>
        </div>
      </div>
    </div>
  );
}
