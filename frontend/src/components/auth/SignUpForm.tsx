"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Lock, Mail, ShieldCheck, Zap } from "lucide-react";
import { signIn } from "next-auth/react";

export default function SignUpForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const locale = useLocale();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";
  const token = searchParams.get("invitationToken") || "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/${locale}/api/auth/register-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al completar el registro");
        setLoading(false);
        return;
      }

      // AUTO-LOGIN: Trigger NextAuth flow from the client to establish the session cookie
      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        // If auto-login fails, redirect to sign-in page instead of throwing error
        window.location.href = `/${locale}/auth/sign-in?registered=true`;
        return;
      }

      window.location.href = `/${locale}/admin/dashboard`;
    } catch {
      setError("Error de red. Intenta nuevamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Email de Invitación
        </label>
        <div className="relative">
          <Mail
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
            size={18}
          />
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 pl-12 pr-4 py-4 text-sm font-bold text-slate-500 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Nueva Contraseña
        </label>
        <div className="relative">
          <Lock
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
            size={18}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 pl-12 pr-4 py-4 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
            placeholder="Mínimo 8 caracteres"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Confirmar Contraseña
        </label>
        <div className="relative">
          <Lock
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
            size={18}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 pl-12 pr-4 py-4 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
            placeholder="Repite tu contraseña"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-xs font-bold italic flex items-center gap-2">
          <Zap size={14} />
          {error}
        </div>
      )}

      <button
        disabled={loading}
        className="w-full rounded-2xl bg-[#0a0a0b] px-4 py-5 text-white font-black text-xs uppercase tracking-[2px] hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-black/10 group flex items-center justify-center gap-2"
      >
        {loading ? "Configurando Acceso..." : "Completar Registro IAM"}
        <ShieldCheck
          size={16}
          className="group-hover:scale-110 transition-transform"
        />
      </button>
    </form>
  );
}
