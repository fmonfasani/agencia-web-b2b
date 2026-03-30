/**
 * components/auth/LoginForm.tsx
 *
 * Formulario de login simple (email + password)
 * Usa el hook useAuth para manejar la autenticación
 */

"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export function LoginForm({
  locale = "es",
  darkMode: _darkMode,
}: {
  locale?: string;
  darkMode?: boolean;
}) {
  const router = useRouter();
  const { login, error: authError, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email y contraseña son requeridos");
      return;
    }

    const success = await login(email, password);
    if (success) {
      router.push(`/${locale}/admin`);
    } else {
      setError(authError || "Login fallido");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Webshooks</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Error Message */}
          {(error || authError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error || authError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {isLoading ? "Autenticando..." : "Ingresar"}
          </button>
        </form>

        {/* Test Credentials */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p className="font-medium mb-2">🧪 Credenciales de prueba:</p>
          <p>
            Email:{" "}
            <code className="bg-white px-2 py-1 rounded">
              fmonfasani@gmail.com
            </code>
          </p>
          <p>
            Contraseña:{" "}
            <code className="bg-white px-2 py-1 rounded">Admin2026!</code>
          </p>
        </div>
      </div>
    </div>
  );
}
