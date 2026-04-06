"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface FloatingInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
}

interface FloatingInputTheme {
  dark: boolean;
}

function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  disabled,
  autoComplete,
  rightSlot,
  dark = true,
}: FloatingInputProps & { dark?: boolean }) {
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
        className={`w-full rounded-lg border px-4 pt-6 pb-2 text-sm outline-none transition-all duration-200 font-medium disabled:opacity-30 ${
          rightSlot ? "pr-11" : ""
        } ${
          dark
            ? `bg-white/[0.03] text-white ${focused ? "border-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" : "border-white/[0.08] hover:border-white/[0.12]"}`
            : `bg-gray-50 text-gray-900 ${focused ? "border-gray-400 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" : "border-gray-200 hover:border-gray-300"}`
        }`}
      />
      <label
        className={`absolute left-4 pointer-events-none transition-all duration-200 ${
          floating
            ? "top-2 text-[9px] font-semibold uppercase tracking-widest " +
              (dark
                ? focused
                  ? "text-white/50"
                  : "text-white/30"
                : focused
                  ? "text-gray-500"
                  : "text-gray-400")
            : `top-1/2 -translate-y-1/2 text-sm ${dark ? "text-white/30" : "text-gray-400"}`
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

export function LoginForm({
  locale = "es",
  darkMode = false,
}: {
  locale?: string;
  darkMode?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email y contraseña son requeridos");
      return;
    }

    setStatus("loading");

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciales incorrectas.");
        setStatus("idle");
        return;
      }

      if (result?.ok) {
        setStatus("success");
        setTimeout(() => {
          router.push(`/${locale}/redirect`);
        }, 600);
      } else {
        setError("Login fallido. Intentá de nuevo.");
        setStatus("idle");
      }
    } catch {
      setError("Error de conexión.");
      setStatus("idle");
    }
  };

  const dark = darkMode;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <FloatingInput
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        disabled={status !== "idle"}
        autoComplete="email"
        dark={dark}
      />

      <FloatingInput
        label="Contraseña"
        type={showPass ? "text" : "password"}
        value={password}
        onChange={setPassword}
        disabled={status !== "idle"}
        autoComplete="current-password"
        dark={dark}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className={`transition-colors ${dark ? "text-white/20 hover:text-white/50" : "text-gray-400 hover:text-gray-600"}`}
            tabIndex={-1}
          >
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      />

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: [0, -5, 5, -5, 5, 0] }}
          transition={{ duration: 0.35 }}
          className={`px-3 py-2.5 rounded-lg text-xs border ${dark ? "bg-red-500/8 border-red-500/15 text-red-400/80" : "bg-red-50 border-red-200 text-red-600"}`}
        >
          {error}
        </motion.div>
      )}

      <motion.button
        type="submit"
        disabled={status !== "idle"}
        whileTap={{ scale: 0.99 }}
        className={`w-full rounded-lg py-3 font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
          status === "success"
            ? dark
              ? "bg-emerald-500/15 border border-emerald-500/20 text-emerald-400"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
            : dark
              ? "bg-white text-black hover:bg-white/90 disabled:opacity-40"
              : "bg-black text-white hover:bg-gray-900 disabled:opacity-40"
        }`}
      >
        {status === "loading" ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Autenticando...
          </>
        ) : status === "success" ? (
          <>
            <Check size={14} />
            ¡Bienvenido!
          </>
        ) : (
          "Continuar"
        )}
      </motion.button>

      <p className="text-center pt-1">
        <button
          type="button"
          className={`transition-colors text-xs ${dark ? "text-white/25 hover:text-white/50" : "text-gray-400 hover:text-gray-600"}`}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </p>
    </form>
  );
}
