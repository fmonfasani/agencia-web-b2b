"use client";

import { useRef, useState } from "react";
import { uploadDocuments } from "@/app/actions/training";
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXTENSIONS = ".pdf,.txt,.csv,.docx";

export default function TrainingUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((f) =>
      ALLOWED_TYPES.includes(f.type),
    );
    if (valid.length < incoming.length) {
      setErrorMsg("Algunos archivos fueron ignorados (formato no permitido).");
    }
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const newOnes = valid
        .filter((f) => !names.has(f.name))
        .map((f) => ({ name: f.name, size: f.size, type: f.type }));
      return [...prev, ...newOnes];
    });
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleSubmit() {
    if (!files.length || !inputRef.current?.files) return;
    setStatus("uploading");
    setErrorMsg(null);

    const fd = new FormData();
    const inputFiles = Array.from(inputRef.current.files).filter((f) =>
      files.some((sf) => sf.name === f.name),
    );
    inputFiles.forEach((f) => fd.append("files", f));

    const result = await uploadDocuments(fd);
    if (result.success) {
      setStatus("success");
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Error al subir archivos");
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
          dragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${dragging ? "bg-blue-100" : "bg-gray-100"}`}
        >
          <Upload
            size={22}
            className={dragging ? "text-blue-500" : "text-gray-400"}
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            Arrastrá archivos aquí o{" "}
            <span className="text-blue-600">seleccioná desde tu equipo</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PDF · TXT · CSV · DOCX — hasta 20 MB c/u
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50"
            >
              <FileText size={16} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {f.name}
                </p>
                <p className="text-xs text-gray-400">{formatBytes(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(f.name)}
                className="text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          <AlertCircle size={14} className="shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Success */}
      {status === "success" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
          <CheckCircle2 size={14} className="shrink-0" />
          Archivos subidos correctamente. El equipo de Webshooks los procesará
          pronto.
        </div>
      )}

      {/* Submit */}
      {files.length > 0 && status !== "success" && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "uploading"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
        >
          {status === "uploading" ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload size={14} />
              Enviar {files.length}{" "}
              {files.length === 1 ? "documento" : "documentos"}
            </>
          )}
        </button>
      )}
    </div>
  );
}
