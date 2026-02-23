"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "next-intl";
import { Lock, Mail } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const locale = useLocale();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/${locale}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok) {
        setError(data.error || "Credenciales inválidas");
        setLoading(false);
        return;
      }

      window.location.href = `/${locale}/admin/dashboard`;
    } catch {
      setError("Error de red. Intenta nuevamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-slate-700">
          Email corporativo
        </label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
            placeholder="admin@empresa.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-semibold text-slate-700"
        >
          Contraseña
        </label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
            placeholder="••••••••"
          />
        </div>
      </div>

      {error ? (
        <div className="p-3 bg-red-50 rounded-xl border border-red-100 italic text-red-600 text-sm">
          {error}
        </div>
      ) : null}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg shadow-slate-200"
      >
        {loading ? "Verificando..." : "Ingresar al Admin"}
      </button>
    </form>
  );
}
