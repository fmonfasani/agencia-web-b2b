import { redirect } from "next/navigation";
import { ShieldCheck, Zap } from "lucide-react";
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

  // Invitation validation is managed via backend-saas API (not yet implemented).
  // Show a placeholder screen directing the user to sign up with their invite token.

  return (
    <div className="min-h-screen bg-[#050506] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[150px] rounded-full pointer-events-none opacity-30"></div>

      <div className="max-w-lg w-full bg-white rounded-[3rem] p-12 shadow-2xl relative z-10 border border-white/10 overflow-hidden">
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

        <div className="space-y-4">
          <Link
            href={`/${locale}/auth/sign-up?invitationToken=${token}`}
            className="flex items-center justify-center gap-3 w-full bg-[#0a0a0b] text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-black/20"
          >
            Aceptar e Ingresar
            <Zap size={18} fill="white" />
          </Link>

          <Link
            href={`/${locale}/auth/sign-in`}
            className="block text-center text-xs text-slate-400 font-medium hover:text-slate-600 transition-colors"
          >
            Ya tengo cuenta — Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
