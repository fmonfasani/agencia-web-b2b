import React from "react";
import {
  Users,
  Zap,
  TrendingUp,
  Clock,
  BarChart3,
  User as UserIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { saasClientFor } from "@/lib/saas-client";

export const dynamic = "force-dynamic";

export default async function TeamPerformanceDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/sign-in`);

  const apiKey = (session.user as any)?.apiKey as string | undefined;

  // Load team members via backend-saas API
  let members: Array<{
    id: string;
    email: string;
    nombre?: string;
    rol: string;
    is_active: boolean;
    created_at: string;
  }> = [];

  if (apiKey) {
    try {
      const client = saasClientFor(apiKey);
      members = await client.auth.users();
    } catch {
      // Graceful degradation — show empty state
    }
  }

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.is_active).length;

  const summaryMetrics = [
    {
      label: "Miembros Activos",
      value: activeMembers.toString(),
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Total Equipo",
      value: totalMembers.toString(),
      icon: BarChart3,
      color: "text-emerald-600",
    },
    {
      label: "Tareas Abiertas",
      value: "—",
      icon: Clock,
      color: "text-amber-600",
    },
    {
      label: "Revenue Hoy",
      value: "—",
      icon: Zap,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      {/* HEADER */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
            Webshooks: Operational Analytics
          </span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Gestión de Equipo
        </h1>
        <p className="text-slate-500 mt-1 max-w-2xl text-lg">
          Datos sincronizados desde IAM y Performance Center.
        </p>
      </div>

      {/* SUMMARY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryMetrics.map((m, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all"
          >
            <div className={`p-4 rounded-2xl bg-slate-50 ${m.color}`}>
              <m.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {m.label}
              </p>
              <h3 className="text-2xl font-black text-slate-900">{m.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* TEAM RANKING */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="text-emerald-500" />
              Ranking de Impacto Real
            </h2>
            <div className="space-y-4">
              {members.length === 0 ? (
                <p className="text-slate-400 italic text-center py-10">
                  No hay colaboradores con métricas aún.
                </p>
              ) : (
                members.map((member, i) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg">
                        {member.email[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">
                          {member.nombre ?? member.email.split("@")[0]}
                        </h4>
                        <p className="text-xs text-slate-500 uppercase font-black">
                          {member.rol}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs px-2 py-1 rounded-lg font-bold uppercase ${
                          member.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {member.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ACTIVITY FEED */}
        <div className="space-y-6">
          <div className="bg-[#0a0a0b] text-white rounded-[2.5rem] p-8 shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap size={20} className="text-amber-400" />
              Live Activity Real
            </h2>
            <div className="space-y-6">
              <p className="text-slate-500 text-sm italic">
                Esperando eventos de negocio...
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TEAM CARDS */}
      <div className="pt-10">
        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <UserIcon size={28} />
          Equipo en el Tenant Actual
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden group hover:border-primary/30 transition-all"
            >
              <div className="p-8 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-3xl bg-slate-100 flex items-center justify-center shadow-inner font-black text-xl text-slate-400">
                      {member.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        {member.nombre ?? member.email}
                      </h3>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest">
                          {member.rol}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100">
                <p className="text-xs text-slate-500 italic">
                  Miembro desde{" "}
                  {new Date(member.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
