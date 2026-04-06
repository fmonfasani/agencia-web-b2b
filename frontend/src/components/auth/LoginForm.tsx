"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!email || !password) {
      setError("Email y contraseña son requeridos");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || "Login fallido");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        router.push(`/${locale}/admin/dashboard`);
      } else {
        setError("Login fallido");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Error de conexión");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14]">
      <div className="bg-[#161923] p-8 rounded-2xl shadow-lg w-full max-w-md border border-[#2a2f3e]">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Webshooks
        </h1>
        <p className="text-center text-[#8b92a5] text-sm mb-6">
          Ingresa a tu cuenta
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-[#8b92a5] uppercase tracking-widest mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5168]" size={15} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={isLoading}
                className="w-full rounded-xl border border-[#2a2f3e] bg-[#161923] pl-10 pr-4 py-3 text-sm text-white placeholder-[#4a5168] outline-none focus:ring-2 focus:ring-[#135bec]/50 focus:border-[#135bec]/50 transition-all font-medium disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-[#8b92a5] uppercase tracking-widest mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5168]" size={15} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full rounded-xl border border-[#2a2f3e] bg-[#161923] pl-10 pr-4 py-3 text-sm text-white placeholder-[#4a5168] outline-none focus:ring-2 focus:ring-[#135bec]/50 focus:border-[#135bec]/50 transition-all font-medium disabled:opacity-50"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#135bec] hover:bg-[#0e45b5] text-white py-3.5 font-bold text-sm disabled:opacity-50 transition-all shadow-lg shadow-[#135bec]/25"
          >
            {isLoading ? "Autenticando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
