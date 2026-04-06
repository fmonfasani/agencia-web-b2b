"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Globe,
  Phone,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SignupWizardProps {
  locale?: string;
}

interface StepData {
  email: string;
  password: string;
  confirm: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  industry: string;
  website: string;
  hasWebsite: boolean;
  plan: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Marketing Digital",
  "Ventas B2B",
  "E-commerce",
  "Consultoría",
  "Tecnología",
  "Salud",
  "Educación",
  "Finanzas",
  "Otro",
];

const PLANS = [
  {
    id: "STARTER",
    name: "Starter",
    price: "$49",
    period: "/mes",
    description: "Perfecto para comenzar",
    features: ["3 usuarios", "1 agente IA", "1 canal", "Soporte por email"],
    highlight: false,
    badge: null,
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$149",
    period: "/mes",
    description: "Para equipos en crecimiento",
    features: [
      "10 usuarios",
      "5 agentes IA",
      "Canales ilimitados",
      "Soporte prioritario",
    ],
    highlight: true,
    badge: "Más popular",
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "$499",
    period: "/mes",
    description: "Sin límites para grandes equipos",
    features: [
      "Usuarios ilimitados",
      "Agentes ilimitados",
      "API access",
      "Webhooks + SLA 99.9%",
    ],
    highlight: false,
    badge: null,
  },
];

const STEP_LABELS = ["Tu cuenta", "Tu empresa", "Elegí tu plan"];

// ─── Floating Input ───────────────────────────────────────────────────────────

function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  disabled,
  autoComplete,
  rightSlot,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const floating = focused || value.length > 0;

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`w-full rounded-lg border bg-white/[0.03] px-4 pt-6 pb-2 text-sm text-white outline-none transition-all duration-200 font-medium disabled:opacity-30 ${
          rightSlot ? "pr-11" : ""
        } ${
          focused
            ? "border-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            : "border-white/[0.08] hover:border-white/[0.12]"
        }`}
      />
      <label
        className={`absolute left-4 pointer-events-none transition-all duration-200 ${
          floating
            ? "top-2 text-[9px] font-semibold uppercase tracking-widest " +
              (focused ? "text-white/50" : "text-white/30")
            : "top-1/2 -translate-y-1/2 text-sm text-white/30"
        }`}
      >
        {label}
      </label>
      {rightSlot && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {rightSlot}
        </div>
      )}
    </div>
  );
}

// ─── Password Strength ────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Muy débil", "Débil", "Aceptable", "Fuerte"];
  const colors = ["#EF4444", "#FBBF24", "#3B82F6", "#10B981"];

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor:
                i < score ? colors[score - 1] : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
      <p
        className="text-[10px]"
        style={{ color: colors[score - 1] ?? "#4a5168" }}
      >
        {password.length > 0 ? (labels[score - 1] ?? "Muy débil") : ""}
      </p>
    </div>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
              i < current
                ? "bg-white text-black"
                : i === current
                  ? "bg-white text-black"
                  : "bg-white/[0.06] border border-white/[0.08] text-white/30"
            }`}
          >
            {i < current ? <Check size={10} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`h-px w-5 transition-all duration-300 ${
                i < current ? "bg-white/30" : "bg-white/[0.06]"
              }`}
            />
          )}
        </div>
      ))}
      <p className="ml-2 text-xs text-white/30 font-medium">
        {STEP_LABELS[current]}
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SignupWizard({ locale = "es" }: SignupWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>({
    email: "",
    password: "",
    confirm: "",
    firstName: "",
    lastName: "",
    companyName: "",
    phone: "",
    industry: "",
    website: "",
    hasWebsite: false,
    plan: "PRO",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const set = (key: keyof StepData) => (value: string | boolean) =>
    setData((prev) => ({ ...prev, [key]: value }));

  // ── Step validation ────────────────────────────────────────────────────────

  const canProceed = () => {
    if (step === 0) {
      if (!data.email || !data.password || !data.confirm) return false;
      if (data.password !== data.confirm) return false;
      if (data.password.length < 8) return false;
      return true;
    }
    if (step === 1) {
      return !!(data.firstName && data.lastName && data.companyName);
    }
    return true;
  };

  const getStepError = () => {
    if (step === 0) {
      if (data.password && data.confirm && data.password !== data.confirm)
        return "Las contraseñas no coinciden";
      if (data.password && data.password.length < 8)
        return "La contraseña debe tener al menos 8 caracteres";
    }
    return null;
  };

  const stepError = getStepError();

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("loading");

    try {
      const response = await fetch(`/${locale}/api/auth/register-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          whatsapp: data.phone,
          companyName: data.companyName,
          industry: data.industry,
          website: data.hasWebsite ? data.website : null,
          plan: data.plan,
          password: data.password,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        setError(json.error || "Error al completar el registro");
        setStatus("idle");
        return;
      }

      const loginResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (loginResult?.error || !loginResult?.ok) {
        setStatus("idle");
        window.location.href = `/${locale}/auth/sign-in?registered=true`;
        return;
      }

      setStatus("success");
      setTimeout(() => {
        window.location.href = `/${locale}/redirect`;
      }, 700);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
      setStatus("idle");
    }
  };

  // ── Render steps ───────────────────────────────────────────────────────────

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-4">
          <FloatingInput
            label="Email corporativo"
            type="email"
            value={data.email}
            onChange={set("email") as (v: string) => void}
            autoComplete="email"
            disabled={status !== "idle"}
          />
          <div className="space-y-1">
            <FloatingInput
              label="Contraseña"
              type={showPass ? "text" : "password"}
              value={data.password}
              onChange={set("password") as (v: string) => void}
              autoComplete="new-password"
              disabled={status !== "idle"}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="text-[#4a5168] hover:text-[#8b92a5] transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
            <PasswordStrength password={data.password} />
          </div>
          <FloatingInput
            label="Confirmar contraseña"
            type={showConfirm ? "text" : "password"}
            value={data.confirm}
            onChange={set("confirm") as (v: string) => void}
            autoComplete="new-password"
            disabled={status !== "idle"}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-[#4a5168] hover:text-[#8b92a5] transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FloatingInput
              label="Nombre"
              value={data.firstName}
              onChange={set("firstName") as (v: string) => void}
            />
            <FloatingInput
              label="Apellido"
              value={data.lastName}
              onChange={set("lastName") as (v: string) => void}
            />
          </div>
          <FloatingInput
            label="Nombre de la empresa"
            value={data.companyName}
            onChange={set("companyName") as (v: string) => void}
          />
          <FloatingInput
            label="WhatsApp / Teléfono"
            type="tel"
            value={data.phone}
            onChange={set("phone") as (v: string) => void}
            rightSlot={<Phone size={14} className="text-[#4a5168]" />}
          />

          {/* Industry select */}
          <div className="relative">
            <select
              value={data.industry}
              onChange={(e) => set("industry")(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-white/20 transition-all appearance-none"
            >
              <option value="" disabled className="bg-black">
                Industria / Sector
              </option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind} className="bg-black">
                  {ind}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                viewBox="0 0 12 12"
                fill="none"
                className="w-3 h-3 text-[#4a5168]"
              >
                <path
                  d="M2 4l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Website toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => set("hasWebsite")(!data.hasWebsite)}
              className={`w-9 h-5 rounded-full transition-all duration-200 relative ${
                data.hasWebsite ? "bg-white/30" : "bg-white/[0.08]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                  data.hasWebsite ? "left-[18px]" : "left-0.5"
                }`}
              />
            </button>
            <span className="text-sm text-white/40">Tengo página web</span>
          </label>
          {data.hasWebsite && (
            <FloatingInput
              label="URL del sitio web"
              type="url"
              value={data.website}
              onChange={set("website") as (v: string) => void}
              rightSlot={<Globe size={14} className="text-[#4a5168]" />}
            />
          )}
        </div>
      );
    }

    // Step 2 — Plan selection
    return (
      <div className="space-y-3">
        {PLANS.map((plan) => (
          <motion.button
            key={plan.id}
            type="button"
            onClick={() => set("plan")(plan.id)}
            whileTap={{ scale: 0.99 }}
            className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
              data.plan === plan.id
                ? "border-white/20 bg-white/[0.05]"
                : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10]"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-bold text-sm">
                    {plan.name}
                  </span>
                  {plan.badge && (
                    <span className="px-2 py-0.5 bg-white/10 text-white/60 text-[9px] font-semibold rounded-full uppercase tracking-wider">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="text-white/30 text-xs mb-2">{plan.description}</p>
                <div className="flex flex-wrap gap-1">
                  {plan.features.map((f) => (
                    <span
                      key={f}
                      className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-md"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <span className="text-white font-black text-lg">
                  {plan.price}
                </span>
                <span className="text-white/30 text-xs">{plan.period}</span>
                <div
                  className={`w-3.5 h-3.5 rounded-full border mt-2 ml-auto flex items-center justify-center transition-all ${
                    data.plan === plan.id
                      ? "border-white/50 bg-white"
                      : "border-white/15"
                  }`}
                >
                  {data.plan === plan.id && (
                    <Check size={9} className="text-white" />
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    );
  };

  return (
    <form
      onSubmit={
        step < 2
          ? (e) => {
              e.preventDefault();
              if (canProceed()) {
                setError(null);
                setStep((s) => s + 1);
              }
            }
          : handleSubmit
      }
      className="space-y-4"
    >
      <StepIndicator current={step} total={3} />

      {/* Step content with slide animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Inline step error */}
      {(stepError || error) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: [0, -5, 5, -5, 5, 0] }}
          transition={{ duration: 0.35 }}
          className="px-3 py-2.5 rounded-lg bg-red-500/8 border border-red-500/15 text-red-400/80 text-xs"
        >
          {stepError ?? error}
        </motion.div>
      )}

      {/* Navigation buttons */}
      <div
        className={`flex gap-3 ${step > 0 ? "justify-between" : "justify-end"}`}
      >
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={status !== "idle"}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-white/30 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] rounded-lg transition-all"
          >
            <ArrowLeft size={14} />
            Atrás
          </button>
        )}

        {step < 2 ? (
          <motion.button
            type="submit"
            disabled={!canProceed() || !!stepError}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-medium rounded-lg transition-all hover:bg-white/90 disabled:opacity-30"
          >
            Continuar
            <ArrowRight size={14} />
          </motion.button>
        ) : (
          <motion.button
            type="submit"
            disabled={status !== "idle"}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
              status === "success"
                ? "bg-emerald-500/15 border border-emerald-500/20 text-emerald-400"
                : "bg-white text-black hover:bg-white/90 disabled:opacity-40"
            }`}
          >
            {status === "loading" ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Desplegando Webshooks...
              </>
            ) : status === "success" ? (
              <>
                <Check size={15} />
                ¡Cuenta creada!
              </>
            ) : (
              <>
                Registrar empresa
                <ArrowRight size={14} />
              </>
            )}
          </motion.button>
        )}
      </div>
    </form>
  );
}
