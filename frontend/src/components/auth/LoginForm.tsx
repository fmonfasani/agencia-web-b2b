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

function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  disabled,
  autoComplete,
  rightSlot,
}: FloatingInputProps) {
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
        className={`w-full rounded-xl border bg-[#0d1017] px-4 pt-5 pb-2 text-sm text-white outline-none transition-all duration-200 font-medium disabled:opacity-40 ${
          rightSlot ? "pr-11" : ""
        } ${
          focused
            ? "border-[#135bec] ring-2 ring-[#135bec]/20 shadow-[0_0_20px_rgba(19,91,236,0.12)]"
            : "border-[#2a2f3e] hover:border-[#3a4055]"
        }`}
      />
      <label
        className={`absolute left-4 pointer-events-none transition-all duration-200 ${
          floating
            ? "top-2 text-[10px] font-semibold uppercase tracking-widest " +
              (focused ? "text-[#135bec]" : "text-[#4a5168]")
            : "top-1/2 -translate-y-1/2 text-sm text-[#4a5168]"
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
        setError("Credenciales incorrectas. Verificá tu email y contraseña.");
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
      setError("Error de conexión. Revisá tu red.");
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FloatingInput
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        disabled={status !== "idle"}
        autoComplete="email"
      />

      <FloatingInput
        label="Contraseña"
        type={showPass ? "text" : "password"}
        value={password}
        onChange={setPassword}
        disabled={status !== "idle"}
        autoComplete="current-password"
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

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: [0, -6, 6, -6, 6, -3, 3, 0] }}
          transition={{ duration: 0.4 }}
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
        >
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-3.5 h-3.5 flex-shrink-0"
          >
            <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm0 3a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 008 4zm0 8a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
          {error}
        </motion.div>
      )}

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={status !== "idle"}
        whileTap={{ scale: 0.98 }}
        className={`w-full rounded-xl py-3.5 font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
          status === "success"
            ? "bg-[#10B981] shadow-[#10B981]/25 text-white"
            : "bg-[#135bec] hover:bg-[#0e45b5] shadow-[#135bec]/25 text-white disabled:opacity-60"
        }`}
      >
        {status === "loading" ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Autenticando...
          </>
        ) : status === "success" ? (
          <>
            <Check size={15} />
            ¡Bienvenido!
          </>
        ) : (
          "Ingresar"
        )}
      </motion.button>

      {/* Forgot password */}
      <p className="text-center text-xs text-[#3a4055]">
        <button
          type="button"
          className="hover:text-[#135bec] transition-colors"
          onClick={() => {}}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </p>
    </form>
  );
}
