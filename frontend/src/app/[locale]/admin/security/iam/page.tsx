import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { saasClientFor } from "@/lib/saas-client";
import {
  UserPlus,
  MoreVertical,
  Zap,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IAMPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/sign-in`);

  const apiKey = (session.user as any)?.apiKey as string | undefined;

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
      // Graceful degradation
    }
  }

  const roles = ["SALES", "MARKETING", "DEVELOPER", "MANAGER", "VIEWER"];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={12} />
              Identity & Access Management
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            IAM Control Center
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl text-lg">
            Emite invitaciones con permisos granulares y monitorea el acceso a
            tu tenant.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULARIO DE INVITACIÓN */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm sticky top-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <UserPlus size={20} className="text-primary" />
              Invitar Colaborador
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Email Corporativo
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="ejemplo@agencia.com"
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm focus:outline-none font-medium opacity-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Rol de Acceso
                </label>
                <select
                  name="role"
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700 opacity-50 cursor-not-allowed"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-3">
                <Clock size={20} className="text-amber-500" />
                <div className="text-[10px] leading-tight">
                  <p className="font-bold text-slate-700 uppercase">
                    Próximamente
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    El módulo de invitaciones estará disponible pronto.
                  </p>
                </div>
              </div>

              <button
                disabled
                className="w-full bg-[#0a0a0b] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest opacity-40 cursor-not-allowed flex items-center justify-center gap-2"
              >
                Generar Invitación
                <Zap size={14} fill="white" />
              </button>
            </div>
          </div>
        </div>

        {/* MIEMBROS ACTUALES */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                Equipo Activo
                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full border border-slate-200">
                  {members.length} USERS
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Identidad
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-8 py-16 text-center text-slate-400 italic text-sm"
                      >
                        No hay miembros registrados todavía.
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-black/5">
                              {member.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-sm block">
                                {member.email}
                              </span>
                              <span className="text-[9px] text-emerald-500 font-black uppercase flex items-center gap-1">
                                <CheckCircle2 size={8} />{" "}
                                {member.is_active ? "Activo" : "Inactivo"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-black text-[10px] text-slate-700 uppercase bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                            {member.rol}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button className="p-2 text-slate-300 hover:text-slate-900 transition-all">
                            <MoreVertical size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
