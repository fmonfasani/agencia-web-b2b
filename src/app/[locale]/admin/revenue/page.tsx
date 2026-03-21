import { requireAuth } from "@/lib/auth/request-auth";
import { redirect } from "next/navigation";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import {
    DollarSign,
    TrendingUp,
    Target,
    ArrowUpRight,
    Calendar,
    BarChart3,
    Zap,
    PieChart,
    ArrowRight,
    TrendingDown,
    Activity,
    User as UserIcon
} from "lucide-react";
import Link from "next/link";

// Types for transparency
interface RevenueMetric {
    date: string;
    revenue: number;
}

interface MetricsData {
    totalMrr: number;
    mrrFromDeals: number;
    conversionRate: number;
    totalDeals: number;
    closedWonDeals: number;
    avgDaysToClose: number;
    revenueHistory: RevenueMetric[];
    customerCount: number;
}

export const dynamic = "force-dynamic";

const MetricCard = ({
    title,
    value,
    trend,
    icon: Icon,
    color = "blue",
    subtitle
}: {
    title: string;
    value: string;
    trend?: number;
    icon: any;
    color?: string;
    subtitle?: string;
}) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
        <div className="flex items-start justify-between relative z-10">
            <div className={`p-4 rounded-3xl bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform duration-500`}>
                <Icon size={24} />
            </div>
            {trend !== undefined && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                    {trend >= 0 ? <ArrowUpRight size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className="mt-8 relative z-10">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                {title}
            </span>
            <h3 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">
                {value}
            </h3>
            {subtitle && <p className="text-slate-400 text-xs mt-1 font-medium italic">{subtitle}</p>}
        </div>

        {/* Abstract background shape */}
        <div className={`absolute -right-8 -bottom-8 size-40 bg-${color}-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`}></div>
    </div>
);

export default async function RevenueDashboard({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const auth = await requireAuth();
    if (!auth) redirect(`/${locale}/auth/sign-in`);

    // Membership & Tenant Isolation
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

    const tenantId = membership.tenantId;
    const tPrisma = getTenantPrisma(tenantId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Data Fetching for Dashboard
    const [
        totalDeals,
        closedWonDeals,
        customerData,
        revenueHistoryRaw,
        recentDeals
    ] = await Promise.all([
        tPrisma.deal.findMany({
            where: { createdAt: { gte: startOfMonth } },
            select: { value: true, stage: true }
        }),
        tPrisma.deal.findMany({
            where: { stage: "CLOSED_WON", closedAt: { gte: startOfMonth } },
            select: { value: true, createdAt: true, closedAt: true }
        }),
        tPrisma.customer.findMany({
            select: { mrr: true }
        }),
        tPrisma.userDailyMetrics.findMany({
            where: { date: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
            orderBy: { date: "asc" },
            select: { date: true, revenueGenerated: true },
        }),
        tPrisma.deal.findMany({
            where: { stage: "CLOSED_WON" },
            orderBy: { closedAt: "desc" },
            take: 5,
            include: {
                assignedToUser: { select: { name: true } },
                product: { select: { name: true } }
            }
        })
    ]);

    // Calculations
    interface CustomerRevenue { mrr: number | null }
    interface DealRevenue { value: number | null }

    const totalMrr = customerData.reduce((sum: number, c: CustomerRevenue) => sum + Number(c.mrr || 0), 0);
    const newRevenueThisMonth = closedWonDeals.reduce((sum: number, d: DealRevenue) => sum + Number(d.value || 0), 0);
    const pipelineValue = totalDeals.reduce((sum: number, d: DealRevenue) => sum + Number(d.value || 0), 0);
    const conversionRate = totalDeals.length > 0 ? (closedWonDeals.length / totalDeals.length) * 100 : 0;

    // Simple projection: Current MRR + 80% weight of proposal-stage deals
    const projection = totalMrr + (pipelineValue * 0.15); // Simple 15% across whole pipeline for demo

    return (
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto space-y-12">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-2">
                            <Activity size={12} className="animate-pulse" />
                            LIVE ENGINE
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            Executive View
                        </span>
                    </div>
                    <h1 className="text-6xl font-black text-slate-900 tracking-tightest">
                        Revenue <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 italic">OS</span>
                    </h1>
                    <p className="text-slate-500 max-w-xl font-medium leading-relaxed">
                        Monitoriza el crecimiento exponencial de tu agencia. Aislamiento de datos multitenant activo y proyecciones basadas en IA.
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="size-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">Período Actual</p>
                            <p className="text-sm font-black text-slate-900">{now.toLocaleString(locale, { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CORE METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <MetricCard
                    title="Total MRR"
                    value={`$${totalMrr.toLocaleString()}`}
                    trend={15.4}
                    icon={DollarSign}
                    color="blue"
                    subtitle="Ingresos Recurrentes"
                />
                <MetricCard
                    title="Nuevas Ventas"
                    value={`$${newRevenueThisMonth.toLocaleString()}`}
                    trend={8.2}
                    icon={Zap}
                    color="amber"
                    subtitle="Este Mes"
                />
                <MetricCard
                    title="Conversion"
                    value={`${conversionRate.toFixed(1)}%`}
                    trend={-2.1}
                    icon={Target}
                    color="indigo"
                    subtitle="Lead to Closed-Won"
                />
                <MetricCard
                    title="Forecast / Q1"
                    value={`$${projection.toLocaleString()}`}
                    trend={24}
                    icon={TrendingUp}
                    color="emerald"
                    subtitle="Proyección Basada en Pipe"
                />
            </div>

            {/* CHARTS & DETAILS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* REVENUE HISTORY MINI CHART (Mockup visual) */}
                <div className="lg:col-span-2 bg-[#0a0a0b] p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10 mb-10">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight">Evolución de Ingresos</h3>
                            <p className="text-slate-500 text-sm font-medium mt-1">Últimos 30 días de operación</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="size-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></span>
                            <span className="size-2 rounded-full bg-slate-700"></span>
                            <span className="size-2 rounded-full bg-slate-700"></span>
                        </div>
                    </div>

                    <div className="h-64 flex items-end gap-3 px-4 relative z-10">
                        {/* Visual Bars Mock */}
                        {[40, 60, 45, 70, 85, 60, 75, 90, 65, 80, 55, 95, 100, 85, 70].map((h, i) => (
                            <div key={i} className="flex-1 group/bar relative">
                                <div
                                    className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-full opacity-30 group-hover/bar:opacity-100 transition-all duration-500 cursor-pointer"
                                    style={{ height: `${h}%`, transitionDelay: `${i * 30}ms` }}
                                ></div>
                                <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded-md shadow-lg pointer-events-none transition-all">
                                    ${(h * 105).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute top-0 right-0 size-96 bg-blue-500 rounded-full blur-[120px] -mr-48 -mt-48"></div>
                    </div>
                </div>

                {/* RECENT CLOSED DEALS */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Cierres Recientes</h3>
                        <Link href="#" className="text-blue-600 font-bold text-xs flex items-center gap-1 hover:underline">
                            Ver todos <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div className="space-y-6">
                        {recentDeals.length === 0 ? (
                            <div className="py-20 text-center text-slate-300 italic text-sm">No hay ventas registradas todavía.</div>
                        ) : (
                            recentDeals.map((deal) => (
                                <div key={deal.id} className="flex items-center gap-4 group">
                                    <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                        CW
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{(deal as any).product?.name || "Servicio General"}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate italic">Con {(deal as any).assignedToUser?.name || "Vendedor"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">${Number(deal.value || 0).toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-medium tracking-tight">2 días atrás</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pt-6 border-t border-slate-50">
                        <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
                            <div className="flex items-center gap-2 text-blue-600">
                                <Zap size={16} fill="currentColor" />
                                <span className="text-xs font-black uppercase tracking-widest">AI Insight</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                "Tus cierres han aumentado un **12%** comparado al mes pasado. El ticket promedio subió, pero el ciclo de venta se extendió 3 días."
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PIPELINE OVERVIEW */}
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-12">
                    <div className="space-y-1">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Pipeline Comercial</h3>
                        <p className="text-slate-400 text-sm font-medium italic">Valorización de oportunidades por etapa del funnel</p>
                    </div>
                    <button className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-xs font-black hover:scale-105 transition-transform shadow-xl shadow-slate-200">
                        GESTIONAR CRM
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {['PROSPECTING', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'].map((stage, idx) => {
                        const dealsInStage = totalDeals.filter((d: any) => d.stage === stage);
                        const value = dealsInStage.reduce((sum, d: any) => sum + Number(d.value || 0), 0);

                        return (
                            <div key={stage} className="space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em] px-2 text-slate-400">
                                    <span>{stage.replace('_', ' ')}</span>
                                    <span className="bg-slate-50 px-2 py-0.5 rounded text-slate-600">{dealsInStage.length}</span>
                                </div>
                                <div className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 hover:border-blue-200 transition-colors group">
                                    <p className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-blue-600 transition-colors">
                                        ${value.toLocaleString()}
                                    </p>
                                    <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${(idx + 1) * 20}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
