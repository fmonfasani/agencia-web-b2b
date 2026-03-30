/**
 * hooks/useApi.ts
 *
 * Hook genérico para hacer requests a los backends.
 * - Lee el X-API-Key desde la sesión de NextAuth (o localStorage como fallback).
 * - Simplifica el manejo de loading, error, y data.
 */

"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { saasClient, agentsClient, ApiResponse } from "@/lib/api/api-client";

export type UseApiOptions = {
  client?: "saas" | "agents";
  skipAuth?: boolean;
  timeout?: number;
};

export function useApi<T = any>(endpoint: string, options: UseApiOptions = {}) {
  const { client = "saas", skipAuth = false } = options;
  const { data: session } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── API Key: primero desde sesión NextAuth, luego localStorage ───────────
  const getApiKey = useCallback((): string | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fromSession = (session?.user as any)?.apiKey;
    if (fromSession) return fromSession;
    if (typeof window !== "undefined") {
      return localStorage.getItem("api_key");
    }
    return null;
  }, [session]);

  const apiClient = client === "agents" ? agentsClient : saasClient;

  const request = useCallback(
    async (method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: any) => {
      setLoading(true);
      setError(null);

      // Inyectar X-API-Key en headers
      const extraHeaders: Record<string, string> = {};
      if (!skipAuth) {
        const apiKey = getApiKey();
        if (apiKey) extraHeaders["X-API-Key"] = apiKey;
      }
      const reqOptions = { headers: extraHeaders };

      let result: ApiResponse<T>;

      try {
        if (method === "GET") {
          result = await apiClient.get<T>(endpoint, reqOptions);
        } else if (method === "POST") {
          result = await apiClient.post<T>(endpoint, body, reqOptions);
        } else if (method === "PUT") {
          result = await apiClient.put<T>(endpoint, body, reqOptions);
        } else if (method === "DELETE") {
          result = await apiClient.delete<T>(endpoint, reqOptions);
        } else {
          throw new Error(`Método HTTP no soportado: ${method}`);
        }

        if (result.success && result.data !== undefined) {
          setData(result.data);
        } else {
          setError(result.error || "Error desconocido");
        }

        setLoading(false);
        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg, status: 0 };
      }
    },
    [endpoint, apiClient, skipAuth, getApiKey],
  );

  const get = useCallback(() => request("GET"), [request]);
  const post = useCallback((body: any) => request("POST", body), [request]);
  const put = useCallback((body: any) => request("PUT", body), [request]);
  const del = useCallback(() => request("DELETE"), [request]);

  return { data, loading, error, request, get, post, put, del };
}

// ─── Hook específico para queries al agente ────────────────────────────────

export function useAgentQuery(tenantId: string) {
  const { data, loading, error, post } = useApi("/agent/execute", {
    client: "agents",
  });

  const execute = useCallback(
    async (query: string) =>
      post({
        query,
        tenant_id: tenantId,
        max_iterations: 5,
      }),
    [tenantId, post],
  );

  return { result: data, loading, error, execute };
}

// ─── Hook para info del tenant ─────────────────────────────────────────────

export function useTenant() {
  const { data, loading, error, get } = useApi("/tenant/me");
  return { tenant: data, loading, error, get };
}

// ─── Hook para traces del agente ───────────────────────────────────────────

export function useAgentTraces(limit = 50) {
  const { data, loading, error, get } = useApi(`/agent/traces?limit=${limit}`, {
    client: "agents",
  });
  return { traces: data, loading, error, refresh: get };
}
