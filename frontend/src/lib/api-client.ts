/**
 * lib/api-client.ts — Server-side API client
 *
 * Para usar en Server Components y Server Actions.
 * Obtiene la API Key desde la session de NextAuth (JWT)
 * e inyecta automáticamente X-API-Key en cada request.
 *
 * Uso:
 *   import { apiClient } from "@/lib/api-client";
 *   const res = await apiClient("/tenant/me");
 *   const data = await res.json();
 */

import { auth } from "@/lib/auth";

const SAAS_URL =
  process.env.NEXT_PUBLIC_SAAS_API_URL || "http://localhost:8000";
const AGENTS_URL =
  process.env.NEXT_PUBLIC_AGENTS_API_URL || "http://localhost:8001";

/**
 * Client genérico — requiere que el llamador pase la apiKey.
 * Para Server Components usa apiClient() que la obtiene automáticamente.
 */
async function fetchWithKey(
  baseUrl: string,
  endpoint: string,
  apiKey: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(options.headers as Record<string, string>),
    },
  });

  if (res.status === 401) throw new Error("API Key inválida o expirada");
  if (res.status === 403) throw new Error("Sin permisos para esta acción");

  return res;
}

/**
 * apiClient — Backend SaaS (puerto 8000)
 * Solo para Server Components / Server Actions.
 */
export async function apiClient(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const session = await auth();
  if (!session?.apiKey) throw new Error("No autenticado");
  return fetchWithKey(SAAS_URL, endpoint, session.apiKey, options);
}

/**
 * agentsClient — Backend Agents (puerto 8001)
 * Solo para Server Components / Server Actions.
 */
export async function agentsClient(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const session = await auth();
  if (!session?.apiKey) throw new Error("No autenticado");
  return fetchWithKey(AGENTS_URL, endpoint, session.apiKey, options);
}

/**
 * Helpers tipados para las operaciones más comunes.
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await apiClient(endpoint, { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `Error ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await apiClient(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `Error ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}
