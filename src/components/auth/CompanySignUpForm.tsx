"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "next-intl";
import { Lock, Mail, Building2, Phone, Globe, ShieldCheck, Zap, User, ChevronDown } from "lucide-react";

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

export default function CompanySignUpForm({ darkMode = false }: { darkMode?: boolean }) {
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
    const locale = useLocale();

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

            window.location.href = `/${locale}/admin/dashboard`;
        } catch {
            setError("Error de red. Intenta nuevamente.");
            setLoading(false);
        }
    }

    const inputClass = darkMode
        ? "w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3.5 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-[#f5e642]/50 focus:border-[#f5e642]/50 transition-all font-medium"
        : "w-full rounded-2xl border border-slate-200 pl-12 pr-4 py-4 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium";

    const labelClass = darkMode
        ? "text-xs font-bold text-white/40 uppercase tracking-widest"
        : "text-xs font-black text-slate-400 uppercase tracking-widest";

    const iconClass = darkMode
        ? "absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
        : "absolute left-4 top-1/2 -translate-y-1/2 text-slate-300";

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className={labelClass}>Nombre</label>
                    <div className="relative">
                        <User className={iconClass} size={18} />
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputClass} placeholder="Juan" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className={labelClass}>Apellido</label>
                    <div className="relative">
                        <User className={iconClass} size={18} />
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className={inputClass} placeholder="García" />
                    </div>
                </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
                <label className={labelClass}>Email Corporativo</label>
                <div className="relative">
                    <Mail className={iconClass} size={18} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="juan@empresa.com" />
                </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
                <label className={labelClass}>WhatsApp</label>
                <div className="relative">
                    <Phone className={iconClass} size={18} />
                    <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} placeholder="+54 9 11 1234-5678" />
                </div>
            </div>

            {/* Company */}
            <div className="space-y-2">
                <label className={labelClass}>Nombre de la Empresa</label>
                <div className="relative">
                    <Building2 className={iconClass} size={18} />
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className={inputClass} placeholder="Mi Agencia SRL" />
                </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={hasWebsite}
                        onChange={(e) => setHasWebsite(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-primary"
                    />
                    <span className={labelClass}>¿Tenés página web?</span>
                </label>
                {hasWebsite && (
                    <div className="relative">
                        <Globe className={iconClass} size={18} />
                        <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className={inputClass} placeholder="https://mi-agencia.com" />
                    </div>
                )}
            </div>

            {/* Plan */}
            <div className="space-y-2">
                <label className={labelClass}>Plan</label>
                <div className="relative">
                    <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 ${darkMode ? "text-white/30" : "text-slate-300"}`} size={18} />
                    <select
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        className={darkMode
                            ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#f5e642]/50 transition-all font-medium appearance-none"
                            : "w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium appearance-none bg-white"
                        }
                    >
                        {PLANS.map((p) => (
                            <option key={p.code} value={p.code} className={darkMode ? "bg-[#1a1d27] text-white" : ""}>
                                {p.label} — {p.description}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className={labelClass}>Contraseña</label>
                    <div className="relative">
                        <Lock className={iconClass} size={18} />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="Min. 8 chars" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className={labelClass}>Confirmar</label>
                    <div className="relative">
                        <Lock className={iconClass} size={18} />
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} placeholder="Repetir" />
                    </div>
                </div>
            </div>

            {error && (
                <div className={`p-4 rounded-xl border text-xs font-bold italic flex items-center gap-2 ${darkMode
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-red-50 border-red-100 text-red-600"
                    }`}>
                    <Zap size={14} />
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl px-4 py-4 font-black text-xs uppercase tracking-[2px] disabled:opacity-50 transition-all group flex items-center justify-center gap-2 ${darkMode
                        ? "bg-[#f5e642] text-[#0f1117] hover:bg-[#ffe900] shadow-lg shadow-[#f5e642]/20"
                        : "bg-[#0a0a0b] text-white hover:bg-slate-800 shadow-xl shadow-black/10"
                    }`}
            >
                {loading ? "Desplegando Revenue OS..." : "Registrar Empresa →"}
                <ShieldCheck size={16} className="group-hover:scale-110 transition-transform" />
            </button>

            <p className="text-center text-xs text-slate-400">
                ¿Ya tenés cuenta?{" "}
                <a href={`/${locale}/auth/sign-in`} className="font-bold text-slate-600 hover:text-primary transition-colors">
                    Iniciá sesión
                </a>
            </p>
        </form>
    );
}
