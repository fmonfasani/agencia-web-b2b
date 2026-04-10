"use client";

import { useReducer, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getOnboardingStatus, uploadDocuments } from "@/app/actions/onboarding";
import { useToast } from "@/hooks/useToast";
import {
  Upload,
  CheckCircle,
  Building2,
  Factory,
  FileText,
  Zap,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Bot,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardState {
  step: 0 | 1 | 2 | 3; // 0=empresa, 1=industria, 2=docs, 3=test
  company: string;
  industry: string;
  selectedFiles: File[];
  uploading: boolean;
  uploadDone: boolean;
  uploadError: string | null;
  docCount: number;
  vectorCount: number;
  testQuery: string;
  testResponse: string | null;
  testLoading: boolean;
}

type Action =
  | { type: "SET_STEP"; step: WizardState["step"] }
  | { type: "SET_COMPANY"; value: string }
  | { type: "SET_INDUSTRY"; value: string }
  | { type: "SET_FILES"; files: File[] }
  | { type: "SET_UPLOADING"; value: boolean }
  | { type: "UPLOAD_SUCCESS"; docCount: number; vectorCount: number }
  | { type: "UPLOAD_ERROR"; error: string }
  | { type: "SET_TEST_QUERY"; value: string }
  | { type: "SET_TEST_RESPONSE"; value: string }
  | { type: "SET_TEST_LOADING"; value: boolean };

const INITIAL: WizardState = {
  step: 0,
  company: "",
  industry: "",
  selectedFiles: [],
  uploading: false,
  uploadDone: false,
  uploadError: null,
  docCount: 0,
  vectorCount: 0,
  testQuery: "",
  testResponse: null,
  testLoading: false,
};

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_COMPANY":
      return { ...state, company: action.value };
    case "SET_INDUSTRY":
      return { ...state, industry: action.value };
    case "SET_FILES":
      return { ...state, selectedFiles: action.files, uploadError: null };
    case "SET_UPLOADING":
      return { ...state, uploading: action.value };
    case "UPLOAD_SUCCESS":
      return {
        ...state,
        uploading: false,
        uploadDone: true,
        uploadError: null,
        docCount: action.docCount,
        vectorCount: action.vectorCount,
        selectedFiles: [],
      };
    case "UPLOAD_ERROR":
      return { ...state, uploading: false, uploadError: action.error };
    case "SET_TEST_QUERY":
      return { ...state, testQuery: action.value };
    case "SET_TEST_RESPONSE":
      return { ...state, testResponse: action.value, testLoading: false };
    case "SET_TEST_LOADING":
      return { ...state, testLoading: action.value };
    default:
      return state;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Retail / E-commerce",
  "Salud / Clínica",
  "Finanzas / Banca",
  "Hotelería / Turismo",
  "Educación",
  "Logística / Transporte",
  "Inmobiliaria",
  "Servicios Profesionales",
  "Tecnología / Software",
  "Otro",
];

const STEPS = [
  { label: "Tu Empresa", icon: Building2 },
  { label: "Industria", icon: Factory },
  { label: "Documentos", icon: FileText },
  { label: "Test Agente", icon: Zap },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { addToast } = useToast();
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Pre-fill status from backend
  useEffect(() => {
    getOnboardingStatus().then((res) => {
      if (res.success && res.data) {
        dispatch({
          type: "UPLOAD_SUCCESS",
          docCount: res.data.documentsCount,
          vectorCount: res.data.vectorsCount,
        });
        // If already has docs, jump to test step
        if (res.data.documentsCount > 0) {
          dispatch({ type: "SET_STEP", step: 3 });
        }
      }
    });
  }, []);

  const handleUpload = async () => {
    if (state.selectedFiles.length === 0) {
      addToast("Selecciona al menos un archivo", "error");
      return;
    }
    dispatch({ type: "SET_UPLOADING", value: true });
    const formData = new FormData();
    state.selectedFiles.forEach((f) => formData.append("files", f));
    const result = await uploadDocuments(formData);
    if (result.success) {
      addToast("✅ Archivos subidos. Procesando vectores...", "success");
      const statusResult = await getOnboardingStatus();
      dispatch({
        type: "UPLOAD_SUCCESS",
        docCount:
          statusResult.data?.documentsCount ?? state.selectedFiles.length,
        vectorCount: statusResult.data?.vectorsCount ?? 0,
      });
    } else {
      dispatch({
        type: "UPLOAD_ERROR",
        error: result.error ?? "Error al subir",
      });
      addToast(result.error ?? "Error al subir archivos", "error");
    }
  };

  const handleTestQuery = async () => {
    if (!state.testQuery.trim()) return;
    dispatch({ type: "SET_TEST_LOADING", value: true });
    try {
      const res = await fetch(`/api/agent/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: state.testQuery }),
      });
      const data = await res.json();
      dispatch({
        type: "SET_TEST_RESPONSE",
        value: data.answer ?? data.response ?? JSON.stringify(data),
      });
    } catch {
      dispatch({
        type: "SET_TEST_RESPONSE",
        value: "Error al consultar el agente.",
      });
    }
  };

  const canAdvance = () => {
    if (state.step === 0) return state.company.trim().length >= 2;
    if (state.step === 1) return state.industry.length > 0;
    if (state.step === 2) return state.uploadDone;
    return true;
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] -m-8 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-[#007AFF] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bot size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1C1C1E]">
            Configura tu Agente IA
          </h1>
          <p className="text-sm text-[#8E8E93] mt-1">
            En 4 pasos tendrás tu agente listo
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8 px-4">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const done = idx < state.step;
            const active = idx === state.step;
            return (
              <div key={idx} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      done
                        ? "bg-[#007AFF] border-[#007AFF]"
                        : active
                          ? "bg-white border-[#007AFF]"
                          : "bg-white border-[#E5E5EA]"
                    }`}
                  >
                    {done ? (
                      <CheckCircle size={20} className="text-white" />
                    ) : (
                      <Icon
                        size={18}
                        className={active ? "text-[#007AFF]" : "text-[#C7C7CC]"}
                      />
                    )}
                  </div>
                  <p
                    className={`text-[10px] font-medium mt-1 ${
                      active
                        ? "text-[#007AFF]"
                        : done
                          ? "text-[#1C1C1E]"
                          : "text-[#C7C7CC]"
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 mb-5 rounded transition-all ${
                      done ? "bg-[#007AFF]" : "bg-[#E5E5EA]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl border border-[#E5E5EA] p-8 shadow-sm"
          >
            {/* Step 0 — Empresa */}
            {state.step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#1C1C1E] mb-1">
                    ¿Cómo se llama tu empresa?
                  </h2>
                  <p className="text-sm text-[#8E8E93]">
                    Personalizaremos el agente con tu marca
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#3A3A3C] block mb-2">
                    Nombre de la empresa
                  </label>
                  <input
                    type="text"
                    value={state.company}
                    onChange={(e) =>
                      dispatch({ type: "SET_COMPANY", value: e.target.value })
                    }
                    placeholder="Ej: Acme Corp"
                    className="w-full px-4 py-3 border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] placeholder-[#C7C7CC]"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Step 1 — Industria */}
            {state.step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#1C1C1E] mb-1">
                    ¿En qué industria operás?
                  </h2>
                  <p className="text-sm text-[#8E8E93]">
                    Ajustaremos el comportamiento del agente a tu sector
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind}
                      onClick={() =>
                        dispatch({ type: "SET_INDUSTRY", value: ind })
                      }
                      className={`px-4 py-3 rounded-xl text-sm font-medium border-2 text-left transition-all ${
                        state.industry === ind
                          ? "border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]"
                          : "border-[#E5E5EA] text-[#3A3A3C] hover:border-[#007AFF]/40"
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 — Documentos */}
            {state.step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#1C1C1E] mb-1">
                    Sube tus documentos
                  </h2>
                  <p className="text-sm text-[#8E8E93]">
                    PDFs, TXTs o CSVs para entrenar tu agente (máx. 25MB c/u)
                  </p>
                </div>

                {state.uploadDone ? (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <div className="w-16 h-16 bg-[#34C759]/10 rounded-full flex items-center justify-center">
                      <CheckCircle size={32} className="text-[#34C759]" />
                    </div>
                    <p className="font-bold text-[#1C1C1E]">
                      {state.docCount} documento
                      {state.docCount !== 1 ? "s" : ""} subido
                      {state.docCount !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-[#8E8E93]">
                      {state.vectorCount} vectores indexados en Qdrant
                    </p>
                  </div>
                ) : (
                  <>
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-[#007AFF]/40 rounded-2xl p-10 cursor-pointer hover:bg-[#007AFF]/5 transition-colors"
                    >
                      <Upload size={32} className="text-[#007AFF] mb-3" />
                      <p className="text-sm font-semibold text-[#007AFF]">
                        Seleccionar archivos
                      </p>
                      <p className="text-xs text-[#8E8E93] mt-1">
                        .pdf .txt .csv
                      </p>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.txt,.csv"
                        onChange={(e) =>
                          dispatch({
                            type: "SET_FILES",
                            files: Array.from(e.target.files ?? []),
                          })
                        }
                        className="hidden"
                        id="file-upload"
                        disabled={state.uploading}
                      />
                    </label>

                    {state.selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        {state.selectedFiles.map((f, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA]"
                          >
                            <div className="w-8 h-8 bg-[#007AFF]/10 rounded-lg flex items-center justify-center text-[10px] font-bold text-[#007AFF]">
                              {f.name.split(".").pop()?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1C1C1E] truncate">
                                {f.name}
                              </p>
                              <p className="text-xs text-[#8E8E93]">
                                {(f.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={handleUpload}
                          disabled={state.uploading}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-[#007AFF] text-white text-sm font-semibold rounded-xl hover:bg-[#0055CC] transition-colors disabled:opacity-50"
                        >
                          {state.uploading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload size={16} />
                              Subir {state.selectedFiles.length} archivo
                              {state.selectedFiles.length !== 1 ? "s" : ""}
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {state.uploadError && (
                      <p className="text-sm text-[#FF3B30] bg-[#FF3B30]/5 rounded-xl p-3 border border-[#FF3B30]/20">
                        {state.uploadError}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 3 — Test */}
            {state.step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#1C1C1E] mb-1">
                    Probá tu agente
                  </h2>
                  <p className="text-sm text-[#8E8E93]">
                    Hacé una consulta de prueba para verificar que todo funciona
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={state.testQuery}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_TEST_QUERY",
                        value: e.target.value,
                      })
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleTestQuery()}
                    placeholder="¿Cuáles son sus servicios?"
                    className="flex-1 px-4 py-3 border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] placeholder-[#C7C7CC]"
                    disabled={state.testLoading}
                  />
                  <button
                    onClick={handleTestQuery}
                    disabled={state.testLoading || !state.testQuery.trim()}
                    className="px-4 py-3 bg-[#007AFF] text-white rounded-xl hover:bg-[#0055CC] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {state.testLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Zap size={16} />
                    )}
                  </button>
                </div>

                {state.testResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#F9F9FB] rounded-2xl border border-[#E5E5EA] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot size={16} className="text-white" />
                      </div>
                      <p className="text-sm text-[#1C1C1E] leading-relaxed">
                        {state.testResponse}
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="bg-[#34C759]/5 border border-[#34C759]/20 rounded-2xl p-5 text-center">
                  <CheckCircle
                    size={32}
                    className="text-[#34C759] mx-auto mb-2"
                  />
                  <p className="font-bold text-[#1C1C1E]">
                    ¡Tu agente está listo!
                  </p>
                  <p className="text-sm text-[#8E8E93] mt-1 mb-4">
                    {state.docCount > 0
                      ? `${state.docCount} docs · ${state.vectorCount} vectores`
                      : "Agente configurado con datos de entrenamiento base"}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <a
                      href="./chat"
                      className="px-5 py-2.5 bg-[#007AFF] text-white text-sm font-semibold rounded-xl hover:bg-[#0055CC] transition-colors"
                    >
                      Ir al Chat →
                    </a>
                    <a
                      href="."
                      className="px-5 py-2.5 bg-[#F2F2F7] text-[#3A3A3C] text-sm font-semibold rounded-xl hover:bg-[#E5E5EA] transition-colors"
                    >
                      Dashboard
                    </a>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() =>
              dispatch({
                type: "SET_STEP",
                step: Math.max(0, state.step - 1) as WizardState["step"],
              })
            }
            disabled={state.step === 0}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#3A3A3C] bg-white border border-[#E5E5EA] rounded-xl hover:bg-[#F2F2F7] transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          {state.step < 3 ? (
            <button
              onClick={() =>
                dispatch({
                  type: "SET_STEP",
                  step: (state.step + 1) as WizardState["step"],
                })
              }
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#007AFF] rounded-xl hover:bg-[#0055CC] transition-colors disabled:opacity-40"
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          ) : (
            <span className="text-xs text-[#8E8E93]">
              Paso {state.step + 1} / 4
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
