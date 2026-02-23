// Solución temporal para tipos de Prisma que no se regeneran en el CI
type LeadSourceType = "SCRAPER" | "MANUAL" | "API" | "ADS";
type BusinessType = "SERVICIO" | "INDUSTRIA" | "COMERCIO" | "OFICIO";
import type { Lead } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/request-auth";
import { redirect } from "next/navigation";
import LeadStatusControl from "@/components/admin/LeadStatusControl";
import {
  Users,
  DollarSign,
  Target,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Globe,
  Database,
  Monitor,
  Plus,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

// --- Visual Helpers ---

const SourceBadge = ({ type }: { type: LeadSourceType }) => {
  const configs = {
    SCRAPER: {
      icon: Database,
      color: "text-purple-600 bg-purple-50",
      label: "Scraper",
    },
    MANUAL: {
      icon: Plus,
      color: "text-amber-600 bg-amber-50",
      label: "Manual",
    },
    API: { icon: Zap, color: "text-blue-600 bg-blue-50", label: "API" },
    ADS: {
      icon: Monitor,
      color: "text-emerald-600 bg-emerald-50",
      label: "Ads",
    },
  };

  const config = configs[type as keyof typeof configs] || configs.MANUAL;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-current opacity-80 ${config.color}`}
    >
      <Icon size={12} />
      <span className="text-[10px] font-bold uppercase">{config.label}</span>
    </div>
  );
};

const BusinessBadge = ({ type }: { type: BusinessType | null }) => {
  if (!type) return <span className="text-slate-300">—</span>;

  const styles = {
    SERVICIO: "border-blue-200 text-blue-700 bg-blue-50",
    INDUSTRIA: "border-purple-200 text-purple-700 bg-purple-50",
    COMERCIO: "border-orange-200 text-orange-700 bg-orange-50",
    OFICIO: "border-emerald-200 text-emerald-700 bg-emerald-50",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[type as keyof typeof styles] || "bg-slate-50 text-slate-500"}`}
    >
      {type}
    </span>
  );
};

const ScoreIndicator = ({ score }: { score: number }) => {
  const color =
    score >= 80
      ? "text-emerald-600"
      : score >= 40
        ? "text-amber-600"
        : "text-rose-600";
  return (
    <div className="flex flex-col gap-1 min-w-[60px]">
      <div className="flex justify-between items-center text-[10px] font-bold">
        <span className={color}>{score} pts</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${score >= 80 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    NEW: "bg-blue-100 text-blue-700 border-blue-200",
    CONTACTED: "bg-amber-100 text-amber-700 border-amber-200",
    QUALIFIED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    LOST: "bg-rose-100 text-rose-700 border-rose-200",
    PROPOSAL_SENT: "bg-purple-100 text-purple-700 border-purple-200",
    DISQUALIFIED: "bg-slate-100 text-slate-400 border-slate-200",
  };
  const label = status || "NEW";
  const style = styles[label as keyof typeof styles] || styles.NEW;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${style}`}
    >
      {label}
    </span>
  );
};

export const dynamic = "force-dynamic";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ElementType;
}

const MetricCard = ({ title, value, trend, icon: Icon }: MetricCardProps) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-4">
      <div
        className={`p-3 rounded-2xl bg-slate-50 text-slate-600 group-hover:scale-110 transition-transform`}
      >
        <Icon size={20} />
      </div>
      {trend && (
        <span
          className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? "text-emerald-600" : "text-rose-600"}`}
        >
          {trend > 0 ? (
            <ArrowUpRight size={14} />
          ) : (
            <ArrowDownRight size={14} />
          )}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
        {title}
      </span>
      <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
    </div>
    <TrendingUp
      size={80}
      className="absolute -right-6 -bottom-6 text-slate-50 opacity-[0.03] rotate-12"
    />
  </div>
);

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; source?: string }>;
}) {
  const { locale } = await params;
  const { page, source } = await searchParams;
  const currentPage = parseInt(page || "1", 10);
  const pageSize = 50;
  const offset = (currentPage - 1) * pageSize;

  const auth = await requireAuth();
  if (!auth) redirect(`/${locale}/auth/sign-in`);

  let membership = await prisma.membership.findFirst({
    where: {
      userId: auth.user.id,
      tenantId: auth.session.tenantId || undefined,
      status: "ACTIVE",
    },
  });

  if (!membership) {
    membership = await prisma.membership.findFirst({
      where: { userId: auth.user.id, status: "ACTIVE" },
    });
  }

  if (!membership) redirect(`/${locale}/auth/sign-in?error=no_membership`);

  const currentRole = membership.role;
  const canEditLeadStatus = currentRole !== "VIEWER";

  // --- Data Fetching ---
  const leads = (await (prisma.lead as any).findMany({
    where: {
      tenantId: membership.tenantId,
      sourceType: source ? (source.toUpperCase() as any) : undefined,
    },
    take: pageSize,
    skip: offset,
    orderBy: { createdAt: "desc" },
  })) as any[];

  // 4. METRICAS TOTALES (Aggregate)
  const stats = (await (prisma.lead as any).aggregate({
    where: { tenantId: membership.tenantId },
    _avg: { potentialScore: true },
    _count: { _all: true },
  })) as any;

  const avgScore = Math.round(stats._avg?.potentialScore || 0);
  const totalLeads = stats._count._all;

  // 5. DISTRIBUCIÓN POR ORIGEN (GroupBy)
  const sourceStats = (await (prisma.lead as any).groupBy({
    by: ["sourceType"],
    where: { tenantId: membership.tenantId },
    _count: true,
  })) as any[];

  const pipelineValue = totalLeads * 2500;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      {/* HEADER VISIÓN COMERCIAL */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
              LEADS ENGINE V2.0
            </span>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
              NORMALIZACIÓN ACTIVA
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Revenue Dashboard
          </h1>
          <p className="text-slate-500 mt-1 max-w-lg">
            Gestión inteligente de leads. Scoring predictivo y normalización de
            adquisición multicanal.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/${locale}/admin/dashboard/ingest`}
            className="bg-[#0a0a0b] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2"
          >
            <Plus size={16} />
            Nuevo Lead Manual
          </Link>
        </div>
      </div>

      {/* MÉTRICAS REVENUE OS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Pipeline Value"
          value={`$${pipelineValue.toLocaleString()}`}
          trend={12.5}
          icon={DollarSign}
        />
        <MetricCard
          title="Leads Capturados"
          value={totalLeads.toLocaleString()}
          trend={4.2}
          icon={Users}
        />
        <MetricCard
          title="Lead Quality Avg"
          value={`${avgScore}%`}
          trend={2.1}
          icon={Target}
        />
        <MetricCard
          title="Scraper Coverage"
          value={
            sourceStats.find((s) => s.sourceType === "SCRAPER")?._count || 0
          }
          icon={Database}
        />
      </div>

      {/* FILTROS POR ORIGEN */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
          Filtrar Origen:
        </span>
        <Link
          href={`/${locale}/admin/dashboard`}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!source ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
        >
          Todos
        </Link>
        <Link
          href={`/${locale}/admin/dashboard?source=scraper`}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${source === "scraper" ? "bg-purple-600 text-white shadow-md shadow-purple-200" : "text-slate-500 hover:bg-slate-50"}`}
        >
          Scraper
        </Link>
        <Link
          href={`/${locale}/admin/dashboard?source=manual`}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${source === "manual" ? "bg-amber-600 text-white shadow-md shadow-amber-200" : "text-slate-500 hover:bg-slate-50"}`}
        >
          Manual
        </Link>
      </div>

      {/* TABLA DE LEADS HUB */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Leads Hub
            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-black border border-slate-200">
              Pág {currentPage} / {Math.ceil(totalLeads / pageSize)} (
              {totalLeads} total)
            </span>
          </h2>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Origen
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Business Type
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Prospecto / Empresa
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Contacto
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Digital Score
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Estado
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">
                    Gestión
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-20 text-center text-slate-400"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Users size={40} className="text-slate-200" />
                        <span className="font-medium">
                          No hay leads todavía en este tenant.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead: any) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <SourceBadge type={lead.sourceType} />
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <BusinessBadge type={lead.businessType} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {lead.companyName || lead.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {lead.address || "No address provided"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 mb-1">
                          {lead.email && (
                            <span
                              title={lead.email}
                              className="size-2 rounded-full bg-blue-400"
                            />
                          )}
                          {lead.phone && (
                            <span
                              title={lead.phone}
                              className="size-2 rounded-full bg-emerald-400"
                            />
                          )}
                          {lead.website && (
                            <Globe size={12} className="text-slate-400" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 transition-all group-hover:text-slate-900">
                          {lead.email || lead.phone || "No contacts"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <ScoreIndicator score={lead.potentialScore} />
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <LeadStatusControl
                          leadId={lead.id}
                          initialStatus={lead.status}
                          locale={locale}
                          canEdit={canEditLeadStatus}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50/50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Páginas de Resultados ({totalLeads} total)
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/${locale}/admin/dashboard?page=${currentPage - 1}${source ? `&source=${source}` : ""}`}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                </Link>
              )}
              {currentPage < Math.ceil(totalLeads / pageSize) && (
                <Link
                  href={`/${locale}/admin/dashboard?page=${currentPage + 1}${source ? `&source=${source}` : ""}`}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
