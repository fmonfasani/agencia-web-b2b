import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ShieldCheck, Zap, Mail } from "lucide-react";
import Link from "next/link";

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;

  if (!token) redirect(`/${locale}/auth/sign-in`);

  // 1. Verificar la invitación
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: token },
    include: { tenant: true, invitedBy: true },
  });

  if (
    !invitation ||
    invitation.status !== "PENDING" ||
    invitation.expiresAt < new Date()
  ) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl text-center">
          <div className="size-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Zap size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            Invitación Inválida
          </h1>
          <p className="text-slate-500 mb-8 font-medium">
            El link ha expirado o ya fue utilizado. Por favor, solicita una
            nueva invitación a tu administrador.
          </p>
          <Link
            href={`/${locale}/auth/sign-in`}
            className="block w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050506] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[150px] rounded-full pointer-events-none opacity-30"></div>

      <div className="max-w-lg w-full bg-white rounded-[3rem] p-12 shadow-2xl relative z-10 border border-white/10 overflow-hidden">
        {/* Top Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-primary to-emerald-500"></div>

        <div className="text-center mb-10">
          <div className="size-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl ring-4 ring-slate-50">
            <ShieldCheck size={32} className="text-amber-400" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">
            Acceso Prioritario
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[3px]">
            Webshooks Gateway
          </p>
        </div>

        <div className="space-y-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-10">
          <div className="flex items-start gap-4">
            <div className="size-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400">
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">
                Invitado como
              </p>
              <p className="text-lg font-black text-slate-900 leading-tight">
                {invitation.email}
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-200"></div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Tenant Target
              </p>
              <p className="font-bold text-slate-900 truncate">
                {invitation.tenant.name}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Rol Asignado
              </p>
              <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                {invitation.role}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href={`/${locale}/auth/sign-up?invitationToken=${token}&email=${encodeURIComponent(invitation.email)}`}
            className="flex items-center justify-center gap-3 w-full bg-[#0a0a0b] text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-black/20"
          >
            Aceptar e Ingresar
            <Zap size={18} fill="white" />
          </Link>

          <p className="text-center text-xs text-slate-400 font-medium px-4">
            Al aceptar, serás incorporado al perímetro de seguridad bajo el rol
            de <strong>{invitation.role}</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
