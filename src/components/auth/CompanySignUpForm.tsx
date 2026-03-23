"use client";

import { FormEvent, useState } from "react";
import {
  Lock,
  Mail,
  Building2,
  Phone,
  Globe,
  ShieldCheck,
  User,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";

const PLANS = [
  {
    code: "STARTER",
    label: "Starter — $49/mes",
    description: "3 usuarios, 1 agente IA, 1 canal",
  },
  {
    code: "PRO",
    label: "Pro — $149/mes",
    description: "10 usuarios, 5 agentes IA, canales ilimitados",
  },
  {
    code: "ENTERPRISE",
    label: "Enterprise — $499/mes",
    description: "Ilimitado, API access, Webhooks",
  },
];

interface CompanySignUpFormProps {
  darkMode?: boolean;
  locale?: string;
}

export default function CompanySignUpForm({
  darkMode = false,
  locale = "es",
}: CompanySignUpFormProps) {
  const en = locale === "en";

  const t = {
    firstName: en ? "First name" : "Nombre",
    lastName: en ? "Last name" : "Apellido",
    email: en ? "Corporate email" : "Email Corporativo",
    emailPh: en ? "john@company.com" : "juan@empresa.com",
    whatsapp: "WhatsApp",
    company: en ? "Company name" : "Empresa",
    companyPh: en ? "My Agency LLC" : "Mi Agencia SRL",
    whatsappPh: en ? "+1 555 123 4567" : "+54 9 11...",
    plan: en ? "Plan" : "Plan",
    website: en ? "Do you have a website?" : "¿Tenés página web?",
    websitePh: "https://my-agency.com",
    password: en ? "Password" : "Contraseña",
    passwordPh: en ? "Min. 8 chars" : "Mín. 8 chars",
    confirm: en ? "Confirm" : "Confirmar",
    confirmPh: en ? "Repeat" : "Repetir",
    submit: en ? "Register Company" : "Registrar Empresa",
    submitting: en ? "Deploying Webshooks..." : "Desplegando Webshooks...",
    signIn: en ? "Already have an account?" : "¿Ya tenés cuenta?",
    signInLink: en ? "Sign in →" : "Iniciá sesión →",
    errorPassMismatch: en
      ? "Passwords don't match"
      : "Las contraseñas no coinciden",
    errorPassLength: en
      ? "Password must be at least 8 characters"
      : "La contraseña debe tener al menos 8 caracteres",
    errorNetwork: en
      ? "Network error. Please try again."
      : "Error de red. Intenta nuevamente.",
    errorGeneric: en
      ? "Error completing registration"
      : "Error al completar el registro",
  };

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hasWebsite, setHasWebsite] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [plan, setPlan] = useState("STARTER");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const response = await fetch(`/${locale}/api/auth/register-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          whatsapp,
          companyName,
          website: hasWebsite ? websiteUrl : null,
          plan,
          password,
        }),
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
    } catch (err) {
      console.error("Signup error:", err);
      setError(t.errorNetwork);
      setLoading(false);
    }
  }

  // ── Unified dark style vars (matches LoginForm dark mode) ──
  const field =
    "w-full rounded-xl border border-[#2a2f3e] bg-[#161923] pl-10 pr-4 py-3 text-sm text-white placeholder-[#4a5168] outline-none focus:ring-2 focus:ring-[#135bec]/50 focus:border-[#135bec]/50 transition-all font-medium";
  const label =
    "text-xs font-semibold text-[#8b92a5] uppercase tracking-widest";
  const icon = "absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5168]";

  if (darkMode) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={label}>{t.firstName}</label>
            <div className="relative">
              <User className={icon} size={15} />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className={field}
                placeholder={en ? "John" : "Juan"}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={label}>{t.lastName}</label>
            <div className="relative">
              <User className={icon} size={15} />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className={field}
                placeholder={en ? "Smith" : "García"}
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className={label}>{t.email}</label>
          <div className="relative">
            <Mail className={icon} size={15} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={field}
              placeholder={t.emailPh}
            />
          </div>
        </div>

        {/* WhatsApp + Company row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={label}>{t.whatsapp}</label>
            <div className="relative">
              <Phone className={icon} size={15} />
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className={field}
                placeholder={t.whatsappPh}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={label}>{t.company}</label>
            <div className="relative">
              <Building2 className={icon} size={15} />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className={field}
                placeholder={t.companyPh}
              />
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="space-y-1.5">
          <label className={label}>Plan</label>
          <div className="relative">
            <ChevronDown
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4a5168]"
              size={15}
            />
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full rounded-xl border border-[#2a2f3e] bg-[#161923] px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#135bec]/50 transition-all font-medium appearance-none"
            >
              {PLANS.map((p) => (
                <option key={p.code} value={p.code} className="bg-[#161923]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Website checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div className="relative" onClick={() => setHasWebsite(!hasWebsite)}>
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${hasWebsite ? "bg-[#135bec] border-[#135bec]" : "border-[#2a2f3e] bg-[#161923]"}`}
            >
              {hasWebsite && (
                <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="white"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-[#8b92a5]">{t.website}</span>
        </label>
        {hasWebsite && (
          <div className="relative">
            <Globe className={icon} size={15} />
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={field}
              placeholder={t.websitePh}
            />
          </div>
        )}

        {/* Password row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={label}>{t.password}</label>
            <div className="relative">
              <Lock className={icon} size={15} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={field}
                placeholder={t.passwordPh}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={label}>{t.confirm}</label>
            <div className="relative">
              <Lock className={icon} size={15} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={field}
                placeholder={t.confirmPh}
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit — blue, matches sign-in */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#135bec] hover:bg-[#0e45b5] text-white py-3.5 font-bold text-sm disabled:opacity-50 transition-all shadow-lg shadow-[#135bec]/25 flex items-center justify-center gap-2"
        >
          {loading ? t.submitting : t.submit}
          <ShieldCheck size={15} />
        </button>

        {/* Sign in link */}
        <p className="text-center text-xs text-[#4a5168]">
          ¿Ya tenés cuenta?{" "}
          <Link
            href={`/${locale}/auth/sign-in`}
            className="text-[#135bec] font-semibold hover:text-blue-400 transition-colors"
          >
            Iniciá sesión →
          </Link>
        </p>
      </form>
    );
  }

  // Light mode (legacy fallback)
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          placeholder="Nombre"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          placeholder="Apellido"
        />
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
        placeholder="Email"
      />
      <input
        type="text"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        required
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
        placeholder="Empresa"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
        placeholder="Contraseña"
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
        placeholder="Confirmar contraseña"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary text-white py-3 font-semibold text-sm disabled:opacity-50"
      >
        {loading ? "Registrando..." : "Registrar Empresa"}
      </button>
    </form>
  );
}
