"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "next-intl";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

interface LoginFormProps {
  darkMode?: boolean;
  locale?: string;
}

export default function LoginForm({ darkMode = false, locale: localeProp }: LoginFormProps) {
  const localeFromHook = useLocale();
  const locale = localeProp ?? localeFromHook;
  const en = locale === "en";

  const t = {
    emailLabel: en ? "Email" : "Email Corporativo",
    emailPlaceholder: en ? "name@company.com" : "admin@empresa.com",
    passwordLabel: en ? "Password" : "Contraseña",
    passwordPlaceholder: "••••••••",
    forgotPassword: en ? "Forgot password?" : "¿Olvidaste tu contraseña?",
    rememberMe: en ? "Remember me" : "Recordarme",
    signInBtn: en ? "Sign in to your account" : "Ingresar a Revenue OS →",
    signingIn: en ? "Signing in..." : "Verificando...",
    noAccount: en ? "Don't have an account?" : "¿No tenés cuenta?",
    signUp: en ? "Create your company →" : "Registrá tu empresa gratis →",
    networkError: en ? "Network error. Please try again." : "Error de red. Intenta nuevamente.",
    invalidCreds: en ? "Invalid credentials" : "Credenciales inválidas",
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/${locale}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = (await response.json()) as { error?: string; success?: boolean };

      if (!response.ok) {
        setError(data.error || t.invalidCreds);
        setLoading(false);
        return;
      }

      window.location.href = `/${locale}/admin/dashboard`;
    } catch {
      setError(t.networkError);
      setLoading(false);
    }
  }

  if (darkMode) {
    // ── DARK (brand blue) mode — used in the new split sign-in page
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Email + Password side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8b92a5] uppercase tracking-widest">
              {t.emailLabel}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5168]" size={15} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-[#2a2f3e] bg-[#161923] pl-10 pr-4 py-3 text-sm text-white placeholder-[#4a5168] outline-none focus:ring-2 focus:ring-[#135bec]/50 focus:border-[#135bec]/50 transition-all"
                placeholder={t.emailPlaceholder}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#8b92a5] uppercase tracking-widest">
                {t.passwordLabel}
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5168]" size={15} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-[#2a2f3e] bg-[#161923] pl-10 pr-10 py-3 text-sm text-white placeholder-[#4a5168] outline-none focus:ring-2 focus:ring-[#135bec]/50 focus:border-[#135bec]/50 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4a5168] hover:text-[#8b92a5] transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? "bg-[#135bec] border-[#135bec]" : "border-[#2a2f3e] bg-[#161923]"}`}>
                {rememberMe && (
                  <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-[#8b92a5]">{t.rememberMe}</span>
          </label>

          <span className="text-sm text-[#4a5168] cursor-not-allowed">
            {t.forgotPassword}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#135bec] hover:bg-[#0e45b5] text-white py-3.5 font-bold text-sm disabled:opacity-50 transition-all shadow-lg shadow-[#135bec]/25 mt-1"
        >
          {loading ? t.signingIn : t.signInBtn}
        </button>
      </form>
    );
  }

  // ── LIGHT (default) mode — legacy style
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-slate-700">
          Email corporativo
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            id="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            required autoComplete="email"
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="admin@empresa.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-semibold text-slate-700">Contraseña</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            id="password" type={showPassword ? "text" : "password"}
            value={password} onChange={(e) => setPassword(e.target.value)}
            required autoComplete="current-password"
            className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="••••••••"
          />
          <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-600 text-sm">{error}</div>}

      <button disabled={loading}
        className="w-full rounded-xl bg-slate-900 text-white px-4 py-3 font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg">
        {loading ? "Verificando..." : "Ingresar al Admin"}
      </button>
    </form>
  );
}
