"use server";

import { auth } from "@/lib/auth";
import {
  saasClientFor,
  AgentResponse,
  AgentProvidersResponse,
} from "@/lib/saas-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LabConfig {
  llm_provider: string;
  model: string;
  temperature: number;
  max_iterations: number;
}

export interface LabRunResult {
  success: boolean;
  data?: AgentResponse;
  error?: string;
  durationMs: number;
}

export interface LabComparisonResult {
  query: string;
  resultA: LabRunResult;
  resultB: LabRunResult;
  winner: "A" | "B" | "tie" | null; // fastest with non-error finish_reason
}

// ── Server Actions ────────────────────────────────────────────────────────────

/**
 * Corre la misma query contra dos configuraciones LLM en paralelo.
 * Retorna ambos resultados + el ganador (más rápido sin error).
 */
export async function runLabComparison(
  query: string,
  configA: LabConfig,
  configB: LabConfig,
): Promise<LabComparisonResult> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const apiKey = (session.user as any)?.apiKey;
  const tenantId = (session.user as any)?.tenantId;
  if (!apiKey || !tenantId) throw new Error("Credenciales incompletas");

  const client = saasClientFor(apiKey);

  async function runSingle(config: LabConfig): Promise<LabRunResult> {
    const start = Date.now();
    try {
      const data = await client.agent.execute({
        query,
        tenant_id: tenantId,
        llm_provider: config.llm_provider,
        model: config.model,
        temperature: config.temperature,
        max_iterations: config.max_iterations,
      });
      return { success: true, data, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        durationMs: Date.now() - start,
      };
    }
  }

  // Correr en paralelo — no esperamos que A termine para arrancar B
  const [settledA, settledB] = await Promise.allSettled([
    runSingle(configA),
    runSingle(configB),
  ]);

  const resultA: LabRunResult =
    settledA.status === "fulfilled"
      ? settledA.value
      : { success: false, error: settledA.reason?.message, durationMs: 0 };

  const resultB: LabRunResult =
    settledB.status === "fulfilled"
      ? settledB.value
      : { success: false, error: settledB.reason?.message, durationMs: 0 };

  // Determinar ganador: más rápido entre los que no tuvieron error
  const aOk =
    resultA.success &&
    resultA.data?.metadata?.finish_reason !== "error" &&
    resultA.data?.metadata?.finish_reason !== "timeout";
  const bOk =
    resultB.success &&
    resultB.data?.metadata?.finish_reason !== "error" &&
    resultB.data?.metadata?.finish_reason !== "timeout";

  let winner: LabComparisonResult["winner"] = null;
  if (aOk && bOk) {
    if (resultA.durationMs < resultB.durationMs) winner = "A";
    else if (resultB.durationMs < resultA.durationMs) winner = "B";
    else winner = "tie";
  } else if (aOk) {
    winner = "A";
  } else if (bOk) {
    winner = "B";
  }

  return { query, resultA, resultB, winner };
}

/**
 * Corre una sola config — usado para llamadas independientes A y B desde el cliente.
 */
export async function runLabSingle(
  query: string,
  config: LabConfig,
): Promise<LabRunResult> {
  const session = await auth();
  if (!session?.user)
    return { success: false, error: "No autenticado", durationMs: 0 };

  const apiKey = (session.user as any)?.apiKey;
  const tenantId = (session.user as any)?.tenantId;
  if (!apiKey || !tenantId)
    return { success: false, error: "Credenciales incompletas", durationMs: 0 };

  const client = saasClientFor(apiKey);
  const start = Date.now();
  try {
    const data = await client.agent.execute({
      query,
      tenant_id: tenantId,
      llm_provider: config.llm_provider,
      model: config.model,
      temperature: config.temperature,
      max_iterations: config.max_iterations,
    });
    return { success: true, data, durationMs: Date.now() - start };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Obtiene los providers/modelos disponibles para poblar los selectores del Lab.
 */
export async function getLabProviders(): Promise<AgentProvidersResponse | null> {
  const session = await auth();
  if (!session?.user) return null;

  const apiKey = (session.user as any)?.apiKey;
  if (!apiKey) return null;

  try {
    const client = saasClientFor(apiKey);
    return await client.agent.providers();
  } catch {
    return null;
  }
}

/**
 * Obtiene las trazas del tenant para mostrar historial de sesiones.
 */
export async function getLabTraces() {
  const session = await auth();
  if (!session?.user) return [];

  const apiKey = (session.user as any)?.apiKey;
  if (!apiKey) return [];

  try {
    const client = saasClientFor(apiKey);
    return await client.agent.traces();
  } catch {
    return [];
  }
}
