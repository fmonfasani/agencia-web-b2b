import React from "react";
import {
  Users,
  Zap,
  TrendingUp,
  CheckCircle2,
  Clock,
  BarChart3,
  User as UserIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/request-auth";
import { redirect } from "next/navigation";

export default async function TeamPerformanceDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const auth = await requireAuth();
  if (!auth) redirect(`/${locale}/auth/sign-in`);

  // --- DATA REAL DESDE LA DB ---

  // 1. Obtener todos los miembros del equipo (incluyendo sus actividades y métricas)
  const members = await prisma.membership.findMany({
    where: {
      tenantId: auth.session.tenantId || "",
      status: "ACTIVE",
    },
    include: {
      user: {
        include: {
          activities: { take: 5, orderBy: { createdAt: "desc" } },
          tasks: { where: { status: { not: "DONE" } } },
          dailyMetrics: { take: 1, orderBy: { date: "desc" } },
        },
      },
    },
  });

  // 2. Últimas actividades globales del tenant
  const latestActivities = await prisma.activity.findMany({
    where: { tenantId: auth.session.tenantId || "" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { user: true },
  });

  interface MembershipWithUser {
    id: string;
    role: string;
    createdAt: Date;
    user: {
      email: string;
      tasks: unknown[];
      activities: unknown[];
      dailyMetrics: Array<{
        revenueGenerated: number;
      }>;
    };
  }

  interface ActivityWithUser {
    type: string;
    createdAt: Date;
    user: {
      email: string;
    };
  }

  // --- CÁLCULOS DE MÉTRICAS EN TIEMPO REAL ---
  const totalMembers = members.length;
  const totalTasksOpen = (members as unknown as MembershipWithUser[]).reduce(
    (acc: number, m: MembershipWithUser) => acc + m.user.tasks.length,
    0,
  );
  const totalRevenue = (members as unknown as MembershipWithUser[]).reduce(
    (acc: number, m: MembershipWithUser) =>
      acc + (Number(m.user.dailyMetrics[0]?.revenueGenerated) || 0),
    0,
  );

  const summaryMetrics = [
    {
      label: "Miembros Activos",
      value: totalMembers.toString(),
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Capacidad Global",
      value: "85%",
      icon: BarChart3,
      color: "text-emerald-600",
    }, // Simulado por ahora
    {
      label: "Tareas Abiertas",
      value: totalTasksOpen.toString(),
      icon: Clock,
      color: "text-amber-600",
    },
    {
      label: "Revenue Hoy",
      value: `$${totalRevenue.toLocaleString()}`,
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
            Revenue OS: Operational Analytics
          </span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Gestión de Equipo Real
        </h1>
        <p className="text-slate-500 mt-1 max-w-2xl text-lg">
          Datos sincronizados desde IAM y Performance Center.
        </p>
      </div>

      {/* BLOQUE: RESUMEN GENERAL (REAL) */}
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
        {/* BLOQUE 1: RANKING DE IMPACTO (REAL basado en Revenue/Impact) */}
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
                (members as unknown as MembershipWithUser[]).map(
                  (member: MembershipWithUser, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`size-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg`}
                        >
                          {member.user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">
                            {member.user.email.split("@")[0]}
                          </h4>
                          <p className="text-xs text-slate-500 uppercase font-black">
                            {member.role}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900">
                          $
                          {Number(
                            member.user.dailyMetrics[0]?.revenueGenerated || 0,
                          ).toLocaleString()}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Revenue Semanal
                        </p>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </div>

        {/* BLOQUE 2: ACTIVIDAD EN TIEMPO REAL (REAL desde la tabla Activity) */}
        <div className="space-y-6">
          <div className="bg-[#0a0a0b] text-white rounded-[2.5rem] p-8 shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap size={20} className="text-amber-400" />
              Live Activity Real
            </h2>
            <div className="space-y-6">
              {latestActivities.length === 0 ? (
                <p className="text-slate-500 text-sm italic">
                  Esperando eventos de negocio...
                </p>
              ) : (
                (latestActivities as unknown as ActivityWithUser[]).map(
                  (a: ActivityWithUser, i: number) => (
                    <div key={i} className="flex gap-4 relative">
                      {i !== latestActivities.length - 1 && (
                        <div className="absolute left-3 top-8 w-px h-8 bg-white/10"></div>
                      )}
                      <div className="size-6 shrink-0 bg-white/10 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-400 leading-none mb-1">
                          {a.user.email.split("@")[0]}
                        </p>
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {a.type}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {new Date(a.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VISTA DE MIEMBROS (Basado en la lista real de IAM) */}
      <div className="pt-10">
        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <UserIcon size={28} />
          Equipo en el Tenant Actual
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(members as unknown as MembershipWithUser[]).map(
            (member: MembershipWithUser) => (
              <div
                key={member.id}
                className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden group hover:border-primary/30 transition-all"
              >
                <div className="p-8 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-16 rounded-3xl bg-slate-100 flex items-center justify-center shadow-inner font-black text-xl text-slate-400">
                        {member.user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900">
                          {member.user.email}
                        </h3>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest">
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mt-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Actividades
                      </p>
                      <p className="text-2xl font-black text-slate-900">
                        {member.user.activities.length}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Tareas Pendientes
                      </p>
                      <p className="text-2xl font-black text-slate-900">
                        {member.user.tasks.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100">
                  <p className="text-xs text-slate-500 italic">
                    Miembro activo desde{" "}
                    {new Date(member.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
