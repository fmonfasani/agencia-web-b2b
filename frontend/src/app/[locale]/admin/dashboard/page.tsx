import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { saasClientFor } from "@/lib/saas-client";
import type { AdminTenantSummary, AdminGlobalStats } from "@/lib/saas-client";
import Link from "next/link";
import {
  Users,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Activity,
  TrendingUp,
  Clock,
  Building2,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Health badge ──────────────────────────────────────────────────────────

function HealthBadge({ status }: { status: AdminTenantSummary["health"] }) {
  const map = {
    healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-rose-50 text-rose-700 border-rose-200",
    inactive: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const icon = {
    healthy: <CheckCircle2 size={11} />,
    warning: <AlertTriangle size={11} />,
    error: <AlertTriangle size={11} />,
    inactive: <Clock size={11} />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${map[status]}`}
    >
      {icon[status]}
      {status}
    </span>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-all">
      <div className={`p-4 rounded-2xl ${accent}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
        {sub && <p className="text-xs text-slate-400 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/sign-in`);

  const apiKey = (session.user as any)?.apiKey as string | undefined;

  let stats: AdminGlobalStats = {
    total_tenants: 0,
    total_active_users: 0,
    queries_7d: 0,
    queries_today: 0,
    errors_7d: 0,
    platform_health: "inactive",
  };
  let tenants: AdminTenantSummary[] = [];

  if (apiKey) {
    const client = saasClientFor(apiKey);
    const [statsResult, tenantsResult] = await Promise.allSettled([
      client.admin.stats(),
      client.admin.tenants(),
    ]);
    if (statsResult.status === "fulfilled") stats = statsResult.value;
    if (tenantsResult.status === "fulfilled") tenants = tenantsResult.value;
  }

  const healthOrder = { error: 0, warning: 1, inactive: 2, healthy: 3 };
  tenants.sort((a, b) => healthOrder[a.health] - healthOrder[b.health]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
            Control Plane
          </span>
          <HealthBadge status={stats.platform_health} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Webshooks Control Center
        </h1>
        <p className="text-slate-500 mt-1 max-w-2xl">
          Vista global de todos los tenants — usage, health, errores en tiempo
          real.
        </p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Tenants activos"
          value={stats.total_tenants}
          icon={Building2}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Usuarios activos"
          value={stats.total_active_users}
          icon={Users}
          accent="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Queries hoy"
          value={stats.queries_today}
          sub={`${stats.queries_7d} esta semana`}
          icon={Zap}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Errores 7d"
          value={stats.errors_7d}
          sub={
            stats.queries_7d > 0
              ? `${((stats.errors_7d / stats.queries_7d) * 100).toFixed(1)}% error rate`
              : "sin actividad"
          }
          icon={AlertTriangle}
          accent={
            stats.errors_7d === 0
              ? "bg-emerald-50 text-emerald-600"
              : "bg-rose-50 text-rose-600"
          }
        />
      </div>

      {/* Tenant list */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/60 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest">
              Todos los Tenants — {tenants.length} registrados
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white">
                <th className="px-8 py-4">Tenant</th>
                <th className="px-8 py-4">Industria</th>
                <th className="px-8 py-4">Usuarios</th>
                <th className="px-8 py-4">Queries 7d</th>
                <th className="px-8 py-4">Latencia avg</th>
                <th className="px-8 py-4">Última actividad</th>
                <th className="px-8 py-4">Health</th>
                <th className="px-8 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-8 py-24 text-center text-slate-400 italic text-sm"
                  >
                    No hay tenants registrados todavía.
                  </td>
                </tr>
              )}
              {tenants.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-slate-50/70 transition-all group"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm shrink-0">
                        {t.nombre[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                          {t.nombre}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {t.id.slice(0, 14)}…
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs text-slate-500 font-medium">
                      {t.industria}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Users size={13} className="text-slate-400" />
                      <span className="font-black text-sm">{t.user_count}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900">
                        {t.usage_7d.total_queries}
                      </span>
                      {t.usage_7d.errors > 0 && (
                        <span className="text-[10px] text-rose-500 font-bold">
                          {t.usage_7d.errors} errores
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-slate-600 font-mono text-sm">
                      {t.usage_7d.avg_latency_ms > 0
                        ? `${t.usage_7d.avg_latency_ms.toLocaleString()}ms`
                        : "—"}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-slate-500 text-xs font-medium tabular-nums">
                      {t.last_activity
                        ? new Date(t.last_activity).toLocaleDateString(locale, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Sin actividad"}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <HealthBadge status={t.health} />
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Link
                      href={`/${locale}/admin/tenants/${t.id}`}
                      className="bg-slate-100 hover:bg-slate-900 text-slate-600 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-block"
                    >
                      Ver tenant
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            href: `/${locale}/admin/security/iam`,
            icon: Users,
            title: "IAM — Gestión de acceso",
            sub: "Usuarios, roles, membresías",
            accent: "text-blue-600",
          },
          {
            href: `/${locale}/admin/observability`,
            icon: Activity,
            title: "Observabilidad",
            sub: "Trazas y métricas globales",
            accent: "text-indigo-600",
          },
          {
            href: `/${locale}/admin/revenue`,
            icon: TrendingUp,
            title: "Revenue OS",
            sub: "MRR, pipeline, forecast",
            accent: "text-emerald-600",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex items-center gap-4 hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <div className={`p-3 rounded-xl bg-slate-50 ${item.accent}`}>
              <item.icon size={20} />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                {item.title}
              </p>
              <p className="text-xs text-slate-400 font-medium">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
