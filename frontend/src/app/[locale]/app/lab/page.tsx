"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Play,
  Loader2,
  Trophy,
  Clock,
  Cpu,
  Zap,
  AlertCircle,
  ChevronDown,
  History,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  runLabSingle,
  getLabProviders,
  type LabConfig,
  type LabRunResult,
} from "@/app/actions/lab";
import type { AgentProvidersResponse, AgentResponse } from "@/lib/saas-client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "comparison" | "history";

const DEFAULT_CONFIG: LabConfig = {
  llm_provider: "ollama",
  model: "gemma3:latest",
  temperature: 0.7,
  max_iterations: 5,
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function LabConfigPanel({
  label,
  config,
  onChange,
  providers,
}: {
  label: "A" | "B";
  config: LabConfig;
  onChange: (c: LabConfig) => void;
  providers: AgentProvidersResponse | null;
}) {
  const providerModels =
    providers?.providers[config.llm_provider as "ollama" | "openrouter"]
      ?.models ?? [];

  const providerAvailable =
    providers?.providers[config.llm_provider as "ollama" | "openrouter"]
      ?.available ?? true;

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
          {label}
        </span>
        <span className="font-semibold text-gray-800 text-sm">
          Configuración {label}
        </span>
        {!providerAvailable && (
          <span className="ml-auto text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Sin conexión
          </span>
        )}
      </div>

      {/* Provider */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Provider
        </label>
        <div className="relative">
          <select
            value={config.llm_provider}
            onChange={(e) => {
              const p = e.target.value;
              const defaultModel =
                providers?.providers[p as "ollama" | "openrouter"]?.models[0] ??
                "";
              onChange({ ...config, llm_provider: p, model: defaultModel });
            }}
            className="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
          >
            <option value="ollama">Ollama (local)</option>
            <option value="openrouter">OpenRouter (cloud)</option>
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Modelo
        </label>
        <div className="relative">
          <select
            value={config.model}
            onChange={(e) => onChange({ ...config, model: e.target.value })}
            className="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
          >
            {providerModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            {providerModels.length === 0 && (
              <option value={config.model}>{config.model}</option>
            )}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Temperatura:{" "}
          <span className="text-blue-600 font-semibold">
            {config.temperature.toFixed(1)}
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={config.temperature}
          onChange={(e) =>
            onChange({ ...config, temperature: parseFloat(e.target.value) })
          }
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>0.0 (determinista)</span>
          <span>2.0 (creativo)</span>
        </div>
      </div>

      {/* Max iterations */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Max iteraciones:{" "}
          <span className="text-blue-600 font-semibold">
            {config.max_iterations}
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={config.max_iterations}
          onChange={(e) =>
            onChange({ ...config, max_iterations: parseInt(e.target.value) })
          }
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>1</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
}

function FinishReasonBadge({ reason }: { reason: string }) {
  const isOk = !["error", "timeout", "llm_error", "embedding_error"].includes(
    reason,
  );
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
      ${isOk ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
    >
      {isOk ? "✓" : "✗"} {reason}
    </span>
  );
}

function ResultPanel({
  label,
  result,
  isWinner,
  isLoading,
}: {
  label: "A" | "B";
  result: LabRunResult | null;
  isWinner: boolean;
  isLoading: boolean;
}) {
  const meta = result?.data?.metadata;
  const messages = result?.data?.result ?? [];
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const answerText =
    assistantMessages.map((m) => m.content).join("\n\n") || "—";

  return (
    <div
      className={`border rounded-xl p-5 bg-white flex flex-col gap-4 relative
      ${isWinner ? "border-amber-400 ring-1 ring-amber-300" : "border-gray-200"}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
          {label}
        </span>
        <span className="font-semibold text-gray-800 text-sm">
          Respuesta {label}
        </span>
        {isWinner && (
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Trophy className="w-3 h-3" /> Más rápido
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Ejecutando agente...</span>
        </div>
      )}

      {/* Error */}
      {!isLoading && result && !result.success && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{result.error}</p>
        </div>
      )}

      {/* Result */}
      {!isLoading && result?.success && (
        <>
          {/* Stats row */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              {(result.durationMs / 1000).toFixed(1)}s total
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-purple-500" />
              {meta?.iterations ?? 0} iter · {meta?.llm_calls ?? 0} LLM calls
            </span>
            {meta?.finish_reason && (
              <FinishReasonBadge reason={meta.finish_reason} />
            )}
          </div>

          {/* Answer */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[80px]">
            {answerText}
          </div>

          {/* Timing breakdown */}
          {meta && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <div className="font-semibold text-blue-700">
                  {meta.embedding_ms}ms
                </div>
                <div className="text-gray-500">Embedding</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-2 text-center">
                <div className="font-semibold text-purple-700">
                  {meta.rag_ms}ms
                </div>
                <div className="text-gray-500">RAG</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 text-center">
                <div className="font-semibold text-amber-700">
                  {meta.llm_ms}ms
                </div>
                <div className="text-gray-500">LLM</div>
              </div>
            </div>
          )}

          {/* Tools + RAG */}
          {meta && (
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              {meta.tools_executed?.length > 0 && (
                <span>🛠 Tools: {meta.tools_executed.join(", ")}</span>
              )}
              {meta.rag_hits_count !== undefined && (
                <span>📚 RAG hits: {meta.rag_hits_count}</span>
              )}
              {meta.model && (
                <span className="ml-auto font-mono text-gray-400">
                  {meta.model}
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!isLoading && !result && (
        <div className="flex items-center justify-center py-12 text-gray-300 text-sm">
          Ejecutá la query para ver el resultado
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentLabPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "es";

  const [tab, setTab] = useState<Tab>("comparison");
  const [query, setQuery] = useState("");
  const [configA, setConfigA] = useState<LabConfig>({ ...DEFAULT_CONFIG });
  const [configB, setConfigB] = useState<LabConfig>({
    ...DEFAULT_CONFIG,
    llm_provider: "openrouter",
    model: "openai/gpt-4o-mini",
  });
  const [providers, setProviders] = useState<AgentProvidersResponse | null>(
    null,
  );
  const [isRunningA, setIsRunningA] = useState(false);
  const [isRunningB, setIsRunningB] = useState(false);
  const [resultA, setResultA] = useState<LabRunResult | null>(null);
  const [resultB, setResultB] = useState<LabRunResult | null>(null);
  const [winner, setWinner] = useState<"A" | "B" | "tie" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRunning = isRunningA || isRunningB;

  // Load providers on mount
  useEffect(() => {
    getLabProviders().then((p) => {
      if (p) {
        setProviders(p);
        // Set sensible defaults based on what's available
        const ollamaModels = p.providers.ollama?.models ?? [];
        const orModels = p.providers.openrouter?.models ?? [];
        if (ollamaModels.length > 0) {
          setConfigA((c) => ({
            ...c,
            llm_provider: "ollama",
            model: ollamaModels[0],
          }));
        }
        if (orModels.length > 0) {
          setConfigB((c) => ({
            ...c,
            llm_provider: "openrouter",
            model: orModels[0],
          }));
        } else if (ollamaModels.length > 1) {
          setConfigB((c) => ({
            ...c,
            llm_provider: "ollama",
            model: ollamaModels[1] ?? ollamaModels[0],
          }));
        }
      }
    });
  }, []);

  const handleRun = useCallback(async () => {
    if (!query.trim() || isRunning) return;
    setIsRunningA(true);
    setIsRunningB(true);
    setResultA(null);
    setResultB(null);
    setWinner(null);
    setError(null);

    const q = query.trim();

    // Run A and B independently — each panel updates as soon as its result arrives
    const runA = runLabSingle(q, configA).then((r) => {
      setResultA(r);
      setIsRunningA(false);
      return r;
    });
    const runB = runLabSingle(q, configB).then((r) => {
      setResultB(r);
      setIsRunningB(false);
      return r;
    });

    // Determine winner once both settle
    Promise.allSettled([runA, runB]).then(([sA, sB]) => {
      const rA = sA.status === "fulfilled" ? sA.value : null;
      const rB = sB.status === "fulfilled" ? sB.value : null;
      const aOk =
        rA?.success &&
        !["error", "timeout", "embedding_error"].includes(
          rA.data?.metadata?.finish_reason ?? "",
        );
      const bOk =
        rB?.success &&
        !["error", "timeout", "embedding_error"].includes(
          rB.data?.metadata?.finish_reason ?? "",
        );
      if (aOk && bOk) {
        if (rA!.durationMs < rB!.durationMs) setWinner("A");
        else if (rB!.durationMs < rA!.durationMs) setWinner("B");
        else setWinner("tie");
      } else if (aOk) setWinner("A");
      else if (bOk) setWinner("B");
    });
  }, [query, configA, configB, isRunning]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleRun();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Lab</h1>
            <p className="text-sm text-gray-500">
              Compará modelos y configuraciones lado a lado
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setTab("comparison")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${tab === "comparison" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Comparación A/B
          </button>
          <Link
            href={`/${locale}/app/lab/sessions`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <History className="w-4 h-4" />
            Historial
          </Link>
        </div>
      </div>

      {/* Query input */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          Query de prueba
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe la query que querés probar con ambas configuraciones..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Ctrl/⌘ + Enter para ejecutar
          </span>
          <button
            onClick={handleRun}
            disabled={!query.trim() || isRunning}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Ejecutando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Ejecutar
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Side-by-side configs + results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column A */}
        <div className="space-y-4">
          <LabConfigPanel
            label="A"
            config={configA}
            onChange={setConfigA}
            providers={providers}
          />
          <ResultPanel
            label="A"
            result={resultA}
            isWinner={winner === "A"}
            isLoading={isRunningA}
          />
        </div>

        {/* Column B */}
        <div className="space-y-4">
          <LabConfigPanel
            label="B"
            config={configB}
            onChange={setConfigB}
            providers={providers}
          />
          <ResultPanel
            label="B"
            result={resultB}
            isWinner={winner === "B"}
            isLoading={isRunningB}
          />
        </div>
      </div>

      {/* Tie message */}
      <AnimatePresence>
        {winner === "tie" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm font-medium"
          >
            <Trophy className="w-4 h-4" />
            Empate — ambos respondieron al mismo tiempo
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
