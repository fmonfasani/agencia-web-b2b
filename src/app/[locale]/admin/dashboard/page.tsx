import { db } from "@/lib/scoped-prisma";
import { requireTenantMembership } from "@/lib/authz";
import { redirect } from "next/navigation";
import { EconomicsService } from "@/lib/economics/tracker";
import LeadsDataTable from "@/components/admin/LeadsDataTable";
import {
  Users,
  DollarSign,
  Target,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Database,
  Plus,
  Map as MapIcon,
  BarChart3,
  Filter,
  LayoutDashboard,
} from "lucide-react";

import Link from "next/link";

export const dynamic = "force-dynamic";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ElementType;
  description?: string;
  color?: string;
}

const MetricCard = ({ title, value, trend, icon: Icon, description, color = "blue" }: MetricCardProps) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      {trend !== undefined && (
        <span className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${trend > 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"}`}>
          {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="relative z-10">
      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
        {title}
      </span>
      <h3 className="text-2xl font-black text-slate-900 mt-1 leading-none">{value}</h3>
      {description && <p className="text-[10px] text-slate-400 mt-2 font-medium">{description}</p>}
    </div>
    <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
      <Icon size={120} />
    </div>
  </div>
);

export default async function CommercialHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { locale } = await params;
  const { source } = await searchParams;

  const { user, tenantId } = await requireTenantMembership(["ADMIN", "SUPER_ADMIN"]);
  const userId = (user as { id?: string; userId?: string })?.id ??
    (user as { id?: string; userId?: string })?.userId;
  if (!userId || !tenantId) {
    throw new Error("TENANT_CONTEXT_REQUIRED");
  }
  const scopedDb = await db({ userId, tenantId });

  // 1. Fetch Leads with Intelligence
  const leadsRaw = await scopedDb.lead.findMany({
    where: {
      sourceType: source ? (source.toUpperCase() as any) : undefined,
    },
    take: 1000,
    orderBy: { createdAt: "desc" },
    include: {
      intelligence: true,
    },
  });

  // 2. Aggregate Metrics
  const totalLeads = leadsRaw.length;
  const scraperLeads = leadsRaw.filter(l => l.sourceType === "SCRAPER").length;
  const withPhone = leadsRaw.filter(l => l.phone || l.intelligence?.hasWhatsappLink).length;
  const withWebsite = leadsRaw.filter(l => l.website).length;

  const avgQuality = totalLeads
    ? Math.round(leadsRaw.reduce((a, l) => a + (l.intelligence?.opportunityScore || l.potentialScore || 0), 0) / totalLeads)
    : 0;

  // 3. Financial Metrics
  const economics = await EconomicsService.getTenantROI(tenantId ?? "");
  const dealsStats = await scopedDb.deal.aggregate({
    _sum: { value: true },
  });
  const pipelineValue = Number(dealsStats._sum.value || 0);

  // 4. Serialize for Client Component
  const serializedLeads = leadsRaw.map(l => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    intelligence: l.intelligence ? {
      ...l.intelligence,
      analyzedAt: l.intelligence.analyzedAt.toISOString(),
      updatedAt: l.intelligence.updatedAt.toISOString(),
    } : null,
  }));

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-[1600px] mx-auto px-8 py-10 space-y-10">

        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded uppercase tracking-tighter shadow-lg shadow-blue-500/20">
                Proprietary Data
              </div>
              <div className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-black rounded uppercase tracking-tighter">
                V2.5 Engine
              </div>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Terminal Comercial <span className="text-blue-600">Hub</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-xl">
              Consolidación de inteligencia comercial, pipeline de ventas y KPIs operativos en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/admin/dashboard?source=scraper`}
              className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${source === "scraper" ? "bg-slate-900 border-slate-900 text-white shadow-xl" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}
            >
              Filtro: Scraper
            </Link>
            <Link
              href={`/${locale}/admin/dashboard?source=manual`}
              className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${source === "manual" ? "bg-slate-900 border-slate-900 text-white shadow-xl" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}
            >
              Filtro: Manual
            </Link>
            <div className="w-px h-8 bg-slate-200 mx-2" />
            <Link
              href={`/${locale}/admin/dashboard/scraper`}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2 group"
            >
              <MapIcon size={14} className="group-hover:rotate-12 transition-transform" />
              Lanzar Discovery
            </Link>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          <MetricCard
            title="Pipeline Value"
            value={`$${pipelineValue.toLocaleString()}`}
            trend={12.5}
            icon={DollarSign}
            color="blue"
            description="Valor total de deals abiertos"
          />
          <MetricCard
            title="Intelligence Coverage"
            value={`${totalLeads}`}
            trend={4.2}
            icon={Users}
            color="indigo"
            description={`${scraperLeads} vía Discovery AI`}
          />
          <MetricCard
            title="Lead Quality Avg"
            value={`${avgQuality}/100`}
            trend={2.1}
            icon={Target}
            color="amber"
            description="Score promedio de oportunidad"
          />
          <MetricCard
            title="Efficiency Score"
            value={`${economics.efficiencyScore.toFixed(1)}x`}
            trend={economics.efficiencyScore > 1 ? 5 : -2}
            icon={Zap}
            color="emerald"
            description="Revenue / Costo Operacional"
          />
          <MetricCard
            title="Net Profit (Unit)"
            value={`$${economics.netProfit.toFixed(2)}`}
            icon={TrendingUp}
            color="slate"
            description={`OpEx Total: $${economics.totalOpEx.toFixed(2)}`}
          />
        </div>

        {/* MAIN DATA SECTION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-900">Base Maestra de Inteligencia</h2>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 shadow-sm">
                <Database size={10} />
                {totalLeads} Entidades
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Live Sync
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            <LeadsDataTable leads={serializedLeads} tenantId={tenantId ?? undefined} locale={locale} />
          </div>
        </div>

      </div>
    </div>
  );
}
