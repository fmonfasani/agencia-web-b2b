"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getOnboardingStatus, uploadDocuments } from "@/app/actions/onboarding";
import { useToast } from "@/components/ui/toast";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

interface OnboardingData {
  tenantId: string;
  status: string;
  documentsCount: number;
  vectorsCount: number;
  postgresOk: boolean;
  qdrantOk: boolean;
  completionPercentage: number;
  step: "upload" | "processing" | "ready";
}

export default function OnboardingPage() {
  const { addToast } = useToast();
  const [statusData, setStatusData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch initial status
  useEffect(() => {
    const fetchStatus = async () => {
      const result = await getOnboardingStatus();
      if (result.success && result.data) {
        setStatusData(result.data);
      } else {
        setError(result.error || "Error loading status");
      }
      setLoading(false);
    };

    fetchStatus();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError("Selecciona al menos un archivo");
      addToast("Selecciona al menos un archivo", "error");
      return;
    }

    setUploading(true);
    setUploadError(null);
    addToast(`Subiendo ${selectedFiles.length} archivo${selectedFiles.length > 1 ? "s" : ""}...`, "info");

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    const result = await uploadDocuments(formData);

    if (result.success) {
      setSelectedFiles([]);
      // Refresh status
      const statusResult = await getOnboardingStatus();
      if (statusResult.success && statusResult.data) {
        setStatusData(statusResult.data);
        addToast("✅ Archivos subidos correctamente. Procesando...", "success");
      }
    } else {
      setUploadError(result.error || "Error uploading files");
      addToast(result.error || "Error al subir archivos", "error");
    }

    setUploading(false);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-4xl font-bold text-gray-900">Onboarding</h1>
        <div className="bg-gray-100 rounded-lg p-12 text-center">
          <div className="animate-pulse">Cargando estado...</div>
        </div>
      </div>
    );
  }

  if (!statusData) {
    return (
      <div className="space-y-8">
        <h1 className="text-4xl font-bold text-gray-900">Onboarding</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error || "Error cargando onboarding"}</p>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 1, label: "Subir Documentos", status: statusData.documentsCount > 0 ? "done" : "pending" as const },
    { id: 2, label: "Procesar", status: statusData.postgresOk && statusData.qdrantOk ? "done" : statusData.documentsCount > 0 ? "in-progress" : "pending" as const },
    { id: 3, label: "Listo", status: statusData.completionPercentage === 100 ? "done" : "pending" as const },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Onboarding de tu Agente IA
        </h1>
        <p className="text-gray-600">
          Carga documentos y configura tu agente IA personalizado
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 font-bold ${
                    step.status === "done"
                      ? "bg-green-100 text-green-600"
                      : step.status === "in-progress"
                        ? "bg-blue-100 text-blue-600 animate-pulse"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {step.status === "done" ? "✓" : step.id}
                </div>
                <p className="text-sm font-medium text-gray-700 text-center">
                  {step.label}
                </p>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 mt-2 rounded ${
                      step.status === "done" ? "bg-green-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">Progreso General</p>
            <p className="text-sm font-bold text-gray-900">
              {statusData.completionPercentage}%
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${statusData.completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Documents Card */}
        <motion.div
          className={`border rounded-lg p-6 ${
            statusData.documentsCount > 0
              ? "border-green-200 bg-green-50"
              : "border-gray-200 bg-gray-50"
          }`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ translateY: -4 }}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-gray-900">Documentos</h3>
            {statusData.documentsCount > 0 ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <AlertCircle className="text-gray-400" size={20} />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">
            {statusData.documentsCount} documento{statusData.documentsCount !== 1 ? "s" : ""} ingestionado
            {statusData.documentsCount !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-gray-500">
            {statusData.documentsCount === 0
              ? "Sube archivos PDF, TXT o CSV"
              : "Documentos cargados correctamente"}
          </p>
        </motion.div>

        {/* PostgreSQL Card */}
        <motion.div
          className={`border rounded-lg p-6 ${
            statusData.postgresOk ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
          }`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ translateY: -4 }}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-gray-900">PostgreSQL</h3>
            {statusData.postgresOk ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <AlertCircle className="text-yellow-600" size={20} />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">
            {statusData.postgresOk ? "✓ Conectado" : "⏳ Conectando..."}
          </p>
          <p className="text-xs text-gray-500">Base de datos para contexto</p>
        </motion.div>

        {/* Qdrant Card */}
        <motion.div
          className={`border rounded-lg p-6 ${
            statusData.qdrantOk ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
          }`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          whileHover={{ translateY: -4 }}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-gray-900">Qdrant</h3>
            {statusData.qdrantOk ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <AlertCircle className="text-yellow-600" size={20} />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">
            {statusData.qdrantOk ? `${statusData.vectorsCount} vectores` : "⏳ Indexando..."}
          </p>
          <p className="text-xs text-gray-500">Base de datos vectorial (RAG)</p>
        </motion.div>
      </div>

      {/* Upload Section */}
      {statusData.completionPercentage < 100 && (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 bg-blue-50">
          <div className="text-center">
            <Upload className="mx-auto mb-3 text-blue-600" size={40} />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Sube tus documentos
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Formatos soportados: PDF, TXT, CSV (máx. 25MB cada uno)
            </p>

            <input
              type="file"
              multiple
              accept=".pdf,.txt,.csv"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Seleccionar Archivos
            </label>

            {selectedFiles.length > 0 && (
              <div className="mt-6 text-left">
                <h4 className="font-medium text-gray-900 mb-3">
                  Archivos seleccionados ({selectedFiles.length}):
                </h4>
                <div className="space-y-2 mb-6">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-white rounded border border-gray-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-gray-600">
                          {file.name.split(".").pop()?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)}KB
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? "Subiendo..." : "Confirmar Subida"}
                </button>
              </div>
            )}

            {uploadError && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                {uploadError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {statusData.completionPercentage === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="text-green-600" size={48} />
          </div>
          <h3 className="text-2xl font-bold text-green-900 mb-2">
            ¡Onboarding Completado!
          </h3>
          <p className="text-green-700 mb-6">
            Tu agente está listo para usar con {statusData.documentsCount}{" "}
            documento{statusData.documentsCount !== 1 ? "s" : ""} y{" "}
            {statusData.vectorsCount} vectores indexados
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/es/app/chat"
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Ir al Chat
            </a>
            <a
              href="/es/app"
              className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Dashboard
            </a>
          </div>
        </div>
      )}

      {/* Processing Info */}
      {statusData.step === "processing" && statusData.completionPercentage < 100 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">⏳ Procesando Documentos</h3>
          <p className="text-blue-700">
            Tu agente está procesando los documentos e indexando vectores. Esto puede tardar unos minutos.
          </p>
        </div>
      )}
    </div>
  );
}
