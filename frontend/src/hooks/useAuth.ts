/**
 * lib/hooks/useAuth.ts
 *
 * Hook para manejar autenticación con backends.
 * - Login con email/password
 * - Logout
 * - Obtener datos del usuario
 * - Verificar si está autenticado
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { saasClient } from "@/lib/api/api-client";

export type User = {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  tenant_id?: string;
};

export type AuthState = {
  user: User | null;
  apiKey: string | null;
  isLoading: boolean;
  error: string | null;
  isLoggedIn: boolean;
};

export type AuthMethods = {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refresh: () => Promise<void>;
};

export function useAuth(): AuthState & AuthMethods {
  const [user, setUser] = useState<User | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("api_key") : null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtener datos del usuario autenticado
   */
  const fetchUser = useCallback(async (key: string) => {
    setIsLoading(true);
    setError(null);

    // Temporalmente añadir el API Key para este request
    const original = localStorage.getItem("api_key");
    localStorage.setItem("api_key", key);

    const result = await saasClient.get<any>("/tenant/me");

    if (original) {
      localStorage.setItem("api_key", original);
    } else {
      localStorage.removeItem("api_key");
    }

    if (result.success && result.data) {
      // Mapear respuesta a nuestro modelo User
      const userData: User = {
        id: result.data.user?.id || result.data.id || "",
        email: result.data.user?.email || result.data.email || "",
        nombre: result.data.user?.nombre || result.data.nombre || "",
        rol: result.data.user?.rol || result.data.rol || "cliente",
        tenant_id: result.data.user?.tenant_id || result.data.tenant_id,
      };
      setUser(userData);
    } else {
      setError(result.error || "No se pudo obtener datos del usuario");
      // Si falla, probablemente el API Key no es válido
      localStorage.removeItem("api_key");
      setApiKey(null);
    }

    setIsLoading(false);
  }, []);

  // Al montar, si hay API Key guardada, cargar datos del usuario
  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("api_key") : null;
    if (stored) {
      fetchUser(stored);
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  /**
   * Login con email y password
   */
  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      // Usar skipAuth porque aún no tenemos API Key
      const result = await saasClient.post<any>(
        "/auth/login",
        { email, password },
        { skipAuth: true },
      );

      if (result.success && result.data?.api_key) {
        const newApiKey = result.data.api_key;
        localStorage.setItem("api_key", newApiKey);
        setApiKey(newApiKey);

        // Obtener datos del usuario
        await fetchUser(newApiKey);
        return true;
      } else {
        setError(result.error || "Email o contraseña incorrectos");
        setIsLoading(false);
        return false;
      }
    },
    [fetchUser],
  );

  /**
   * Logout
   */
  const logout = useCallback(() => {
    localStorage.removeItem("api_key");
    setApiKey(null);
    setUser(null);
    setError(null);
  }, []);

  /**
   * Refrescar datos del usuario
   */
  const refresh = useCallback(async () => {
    if (apiKey) {
      await fetchUser(apiKey);
    }
  }, [apiKey, fetchUser]);

  return {
    user,
    apiKey,
    isLoading,
    error,
    isLoggedIn: !!apiKey && !!user,
    login,
    logout,
    refresh,
  };
}
