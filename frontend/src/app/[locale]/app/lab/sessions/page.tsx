"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Search,
  MessageSquare,
  Clock,
  ArrowRight,
  ChevronLeft,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getLabTraces } from "@/app/actions/lab";
import type { AgentTrace } from "@/lib/saas-client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionGroup {
  sessionId: string;
  firstQuery: string;
  messageCount: number;
  lastAt: string;
  traces: AgentTrace[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupTracesBySessions(traces: AgentTrace[]): SessionGroup[] {
  const map = new Map<string, AgentTrace[]>();

  for (const trace of traces) {
    // session_id may be in metadata or use trace_id as fallback key
    const sid =
      (trace as any).session_id ??
      (trace.metadata as any)?.session_id ??
      trace.id;
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid)!.push(trace);
  }

  const groups: SessionGroup[] = [];
  for (const [sessionId, ts] of map.entries()) {
    const sorted = [...ts].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    groups.push({
      sessionId,
      firstQuery: sorted[0]?.query ?? "—",
      messageCount: sorted.length,
      lastAt: sorted[sorted.length - 1]?.created_at ?? "",
      traces: sorted,
    });
  }

  // Most recent first
  return groups.sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
}

function formatRelativeTime(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 2) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
}

// ── Session Card ──────────────────────────────────────────────────────────────

function SessionCard({
  session,
  isSelected,
  onClick,
}: {
  session: SessionGroup;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      onClick={onClick}
      className={`w-full text-left px-4 py-4 rounded-xl border transition-all
        ${
          isSelected
            ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 line-clamp-2 flex-1">
          {session.firstQuery}
        </p>
        {isSelected && (
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          {session.messageCount}{" "}
          {session.messageCount === 1 ? "traza" : "trazas"}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(session.lastAt)}
        </span>
      </div>
    </motion.button>
  );
}

// ── Session Detail Panel ──────────────────────────────────────────────────────

function SessionDetail({
  session,
  locale,
}: {
  session: SessionGroup;
  locale: string;
}) {
  const chatUrl = `/${locale}/app/chat?conversation_id=${encodeURIComponent(session.sessionId)}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Sesión</h3>
          <p className="font-mono text-xs text-gray-400 mt-0.5">
            {session.sessionId}
          </p>
        </div>
        <Link
          href={chatUrl}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continuar <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Traces */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {session.traces.map((trace, i) => {
          const isUser = true; // every trace starts with a user query
          const assistantContent =
            (trace as any).result_text ??
            (Array.isArray((trace as any).result)
              ? (trace as any).result
                  .filter((m: any) => m.role === "assistant")
                  .map((m: any) => m.content)
                  .join("\n")
              : trace.result) ??
            "—";

          return (
            <motion.div
              key={trace.id ?? i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="space-y-2"
            >
              {/* User bubble */}
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-blue-600 text-white rounded-xl rounded-tr-sm px-4 py-2.5 text-sm">
                  {trace.query}
                </div>
              </div>

              {/* Assistant bubble */}
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-gray-100 text-gray-800 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
                  {assistantContent}
                </div>
              </div>

              {/* Trace metadata */}
              <div className="flex items-center gap-3 px-2 text-xs text-gray-400">
                {trace.total_duration_ms && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(trace.total_duration_ms / 1000).toFixed(1)}s
                  </span>
                )}
                {trace.iterations !== undefined && (
                  <span>{trace.iterations} iter</span>
                )}
                {trace.metadata?.finish_reason && (
                  <span
                    className={
                      ["error", "timeout"].includes(
                        trace.metadata.finish_reason,
                      )
                        ? "text-red-400"
                        : "text-green-600"
                    }
                  >
                    {trace.metadata.finish_reason}
                  </span>
                )}
                <span className="ml-auto">
                  {formatRelativeTime(trace.created_at)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LabSessionsPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "es";

  const [sessions, setSessions] = useState<SessionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SessionGroup | null>(null);

  useEffect(() => {
    getLabTraces().then((traces) => {
      const groups = groupTracesBySessions(traces);
      setSessions(groups);
      if (groups.length > 0) setSelected(groups[0]);
      setIsLoading(false);
    });
  }, []);

  const filtered = sessions.filter((s) =>
    s.firstQuery.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/app/lab`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Agent Lab
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <History className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Historial de Sesiones
            </h1>
            <p className="text-xs text-gray-500">{sessions.length} sesiones</p>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
        {/* Session list */}
        <div className="lg:col-span-1 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar sesiones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Cargando sesiones...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-2">
              <History className="w-8 h-8" />
              <p className="text-sm">
                {search ? "Sin resultados" : "No hay sesiones aún"}
              </p>
              {!search && (
                <Link
                  href={`/${locale}/app/lab`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ejecutar una query en el Lab →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {filtered.map((session) => (
                <SessionCard
                  key={session.sessionId}
                  session={session}
                  isSelected={selected?.sessionId === session.sessionId}
                  onClick={() => setSelected(session)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.sessionId}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="h-full"
              >
                <SessionDetail session={selected} locale={locale} />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 py-20"
              >
                <MessageSquare className="w-10 h-10" />
                <p className="text-sm">
                  Seleccioná una sesión para ver el detalle
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
