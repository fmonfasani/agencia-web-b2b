import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { saasClientFor } from "@/lib/saas-client";
import type { AdminTenantOverview, AdminLogsResponse } from "@/lib/saas-client";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  TrendingUp,
  ServerCrash,
  Timer,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthDot({ health }: { health: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-emerald-500",
    warning: "bg-amber-400",
    error: "bg-rose-500",
    inactive: "bg-slate-400",
  };
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${colors[health] ?? "bg-slate-400"} shadow`}
    />
  );
}

function FinishReasonBadge({ reason }: { reason: string }) {
  const map: Record<string, string> = {
    results_found: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rag_only: "bg-blue-50 text-blue-700 border-blue-200",
    no_results: "bg-slate-100 text-slate-600 border-slate-200",
    max_iterations: "bg-amber-50 text-amber-700 border-amber-200",
    llm_error: "bg-rose-50 text-rose-700 border-rose-200",
    embedding_error: "bg-orange-50 text-orange-700 border-orange-200",
    forced_stop: "bg-purple-50 text-purple-700 border-purple-200",
    loop_detected: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${map[reason] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
    >
      {reason.replace(/_/g, " ")}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string; had_error?: string; q?: string }>;
}) {
  const { locale, id: tenantId } = await params;
  const { tab = "overview", had_error, q } = await searchParams;

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/sign-in`);

  const apiKey = (session.user as any)?.apiKey as string | undefined;
  if (!apiKey) redirect(`/${locale}/admin/dashboard`);

  const client = saasClientFor(apiKey);

  let overview: AdminTenantOverview | null = null;
  let logs: AdminLogsResponse | null = null;

  const [overviewResult, logsResult] = await Promise.allSettled([
    client.admin.tenantOverview(tenantId),
    client.admin.tenantLogs(tenantId, {
      limit: 50,
      had_error:
        had_error === "true" ? true : had_error === "false" ? false : undefined,
      q: q || undefined,
    }),
  ]);

  if (overviewResult.status === "fulfilled") overview = overviewResult.value;
  if (logsResult.status === "fulfilled") logs = logsResult.value;

  if (!overview) notFound();

  const { tenant, users, usage, health, recent_traces } = overview;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Back + Header */}
      <div>
        <Link
          href={`/${locale}/admin/dashboard`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm font-bold transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Control Center
        </Link>

        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <HealthDot health={health} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {health} · {tenant.industria}
              </span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              {tenant.nombre}
            </h1>
            <p className="text-slate-400 font-mono text-xs mt-1">{tenant.id}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Creado
            </p>
            <p className="text-sm font-bold text-slate-700">
              {tenant.created_at
                ? new Date(tenant.created_at).toLocaleDateString(locale)
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Usage summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: "Queries hoy",
            value: usage.queries_today,
            icon: Zap,
            accent: "bg-amber-50 text-amber-600",
          },
          {
            label: "Queries 7d",
            value: usage.queries_7d,
            sub: `${usage.queries_30d} en 30d`,
            icon: TrendingUp,
            accent: "bg-blue-50 text-blue-600",
          },
          {
            label: "Éxito 7d",
            value:
              usage.success_rate_7d != null
                ? `${(usage.success_rate_7d * 100).toFixed(1)}%`
                : "—",
            icon: CheckCircle2,
            accent: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Errores 7d",
            value: usage.errors_7d,
            sub: `${usage.avg_latency_ms_7d}ms avg`,
            icon: usage.errors_7d > 0 ? AlertTriangle : Activity,
            accent:
              usage.errors_7d > 0
                ? "bg-rose-50 text-rose-600"
                : "bg-slate-50 text-slate-600",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 flex items-center gap-3"
          >
            <div className={`p-3 rounded-xl ${c.accent}`}>
              <c.icon size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {c.label}
              </p>
              <p className="text-xl font-black text-slate-900">{c.value}</p>
              {c.sub && (
                <p className="text-[10px] text-slate-400 font-medium">
                  {c.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { key: "overview", label: "Overview" },
          { key: "logs", label: `Logs${logs ? ` (${logs.total})` : ""}` },
          { key: "users", label: `Usuarios (${users.length})` },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={`/${locale}/admin/tenants/${tenantId}?tab=${key}`}
            className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {tab === "overview" && (
        <div className="space-y-8">
          {/* Latency detail */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <Timer size={18} className="text-blue-500" />
              Latencia 7 días
            </h2>
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: "Mínima", value: usage.min_latency_ms_7d },
                { label: "Promedio", value: usage.avg_latency_ms_7d },
                { label: "Máxima", value: usage.max_latency_ms_7d },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                    {label}
                  </p>
                  <p className="text-3xl font-black text-slate-900 tabular-nums">
                    {value > 0 ? `${value.toLocaleString()}` : "—"}
                  </p>
                  {value > 0 && (
                    <p className="text-xs text-slate-400 font-medium">ms</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent traces */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                Últimas trazas
              </h2>
              <Link
                href={`/${locale}/admin/tenants/${tenantId}?tab=logs`}
                className="text-blue-600 text-xs font-black hover:underline"
              >
                Ver todas →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recent_traces.length === 0 ? (
                <p className="px-8 py-12 text-center text-slate-400 italic text-sm">
                  Sin trazas registradas.
                </p>
              ) : (
                recent_traces.map((t) => (
                  <div
                    key={t.trace_id}
                    className="px-8 py-4 flex items-start gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="shrink-0 mt-0.5">
                      {t.had_error ? (
                        <ServerCrash size={16} className="text-rose-400" />
                      ) : (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 font-medium truncate">
                        {t.query || "(sin query)"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <FinishReasonBadge
                          reason={t.finish_reason || "unknown"}
                        />
                        {t.total_ms != null && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {t.total_ms.toLocaleString()}ms
                          </span>
                        )}
                        {t.iterations != null && (
                          <span className="text-[10px] text-slate-400">
                            {t.iterations} iter
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleTimeString(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Logs ── */}
      {tab === "logs" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/${locale}/admin/tenants/${tenantId}?tab=logs`}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${!had_error ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
            >
              Todos
            </Link>
            <Link
              href={`/${locale}/admin/tenants/${tenantId}?tab=logs&had_error=true`}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${had_error === "true" ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
            >
              Solo errores
            </Link>
            <Link
              href={`/${locale}/admin/tenants/${tenantId}?tab=logs&had_error=false`}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${had_error === "false" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
            >
              Solo exitosos
            </Link>
          </div>

          {/* Logs table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {logs?.total ?? 0} registros encontrados
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {(logs?.rows ?? []).length === 0 ? (
                <p className="px-8 py-12 text-center text-slate-400 italic text-sm">
                  No hay logs con los filtros seleccionados.
                </p>
              ) : (
                (logs?.rows ?? []).map((row) => (
                  <div
                    key={row.trace_id}
                    className="px-8 py-4 flex items-start gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="shrink-0 mt-0.5">
                      {row.had_error ? (
                        <ServerCrash size={16} className="text-rose-400" />
                      ) : (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 font-medium">
                        {row.query || "(sin query)"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <FinishReasonBadge
                          reason={row.finish_reason || "unknown"}
                        />
                        {row.total_ms != null && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {row.total_ms.toLocaleString()}ms
                          </span>
                        )}
                        {row.iterations != null && (
                          <span className="text-[10px] text-slate-400">
                            {row.iterations} iter
                          </span>
                        )}
                        {row.model && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {row.model}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-300 font-mono">
                          {row.trace_id.slice(0, 12)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleDateString(
                              locale,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "—"}
                      </p>
                      {row.tokens_in != null && (
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          {row.tokens_in}↑ {row.tokens_out}↓
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Users ── */}
      {tab === "users" && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              {users.length} usuario{users.length !== 1 ? "s" : ""} en este
              tenant
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <p className="px-8 py-12 text-center text-slate-400 italic text-sm">
                No hay usuarios registrados.
              </p>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-sm">
                      {u.email[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {u.name || u.email}
                      </p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 uppercase">
                      {u.role}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase ${
                        u.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {u.status}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString(locale)
                        : "—"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
