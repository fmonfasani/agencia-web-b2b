import { listLeadsByTenant, countLeadsByTenant } from "@/lib/lead-repository";
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
} from "lucide-react";
import Link from "next/link";

// Inline components for simplicity
const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    NEW: "bg-blue-100 text-blue-700 border-blue-200",
    CONTACTED: "bg-amber-100 text-amber-700 border-amber-200",
    QUALIFIED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    LOST: "bg-rose-100 text-rose-700 border-rose-200",
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
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page } = await searchParams;
  const currentPage = parseInt(page || "1", 10);
  const pageSize = 50;
  const offset = (currentPage - 1) * pageSize;

  const auth = await requireAuth();

  if (!auth) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // Obtener membresía
  // @ts-expect-error - membership type
  let membership = await prisma.membership.findFirst({
    where: {
      userId: auth.user.id,
      tenantId: auth.session.tenantId || undefined,
      status: "ACTIVE",
    },
  });

  if (!membership) {
    // @ts-expect-error - membership type
    membership = await prisma.membership.findFirst({
      where: { userId: auth.user.id, status: "ACTIVE" },
    });
  }

  if (!membership) {
    redirect(`/${locale}/auth/sign-in?error=no_membership`);
  }

  const currentRole = membership.role;
  const canEditLeadStatus = currentRole !== "VIEWER";

  // Fetch metrics and paginated leads
  const totalLeads = await countLeadsByTenant(membership.tenantId);
  const leads: Lead[] = await listLeadsByTenant(
    membership.tenantId,
    pageSize,
    offset,
  );

  // Mocked Metrics for Revenue OS Vision
  const pipelineValue = totalLeads * 2500; // Average deal value mock
  const winRate = "24.5%";
  const velocity = "12 days";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      {/* HEADER VISIÓN COMERCIAL */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
              LEVEL 2: COMERCIAL
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Revenue Dashboard
          </h1>
          <p className="text-slate-500 mt-1 max-w-lg">
            Centro de control operativo de ventas. Monitorea el flujo de capital
            y la eficiencia de tu embudo de leads.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
            Exportar CSV
          </button>
          <button className="bg-[#0a0a0b] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2">
            <Zap size={16} fill="white" />
            Nuevas Reglas RPA
          </button>
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
          title="Win Rate"
          value={winRate}
          trend={-1.4}
          icon={Target}
        />
        <MetricCard title="Sales Velocity" value={velocity} icon={Clock} />
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
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button className="bg-white px-3 py-1.5 rounded-md shadow-sm text-xs font-bold text-slate-900">
              Vista Tabla
            </button>
            <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">
              Kanban (Soon)
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Ingreso
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Prospecto
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Empresa
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Potencial
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
                      colSpan={6}
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
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {new Date(lead.createdAt).toLocaleDateString(
                              "es-AR",
                              {
                                day: "2-digit",
                                month: "short",
                              },
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(lead.createdAt).toLocaleTimeString(
                              "es-AR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {lead.name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {lead.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-slate-600 font-medium">
                          {lead.company || "Independiente"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                          {lead.budget
                            ? lead.budget.replace("range_", "")
                            : "Standard"}
                        </span>
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

          {/* PAGINATION CONTROLS */}
          {totalLeads > pageSize && (
            <div className="bg-slate-50/50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Mostrando {offset + 1}-{Math.min(offset + pageSize, totalLeads)}{" "}
                de {totalLeads}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`/${locale}/admin/dashboard?page=${currentPage - 1}`}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </Link>
                )}
                {currentPage < Math.ceil(totalLeads / pageSize) && (
                  <Link
                    href={`/${locale}/admin/dashboard?page=${currentPage + 1}`}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
