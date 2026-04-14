"use server";

import { auth } from "@/lib/auth";
import { saasClientFor } from "@/lib/saas-client";

// Token pricing per 1M tokens (USD)
const TOKEN_PRICING: Record<
  string,
  { in: number; out: number; label: string }
> = {
  // OpenRouter models
  "openai/gpt-4o-mini": { in: 0.15, out: 0.6, label: "GPT-4o Mini" },
  "openai/gpt-3.5-turbo": { in: 0.5, out: 1.5, label: "GPT-3.5 Turbo" },
  "anthropic/claude-haiku": { in: 0.25, out: 1.25, label: "Claude Haiku" },
  "anthropic/claude-3.5-sonnet": {
    in: 3.0,
    out: 15.0,
    label: "Claude 3.5 Sonnet",
  },
  "meta-llama/llama-3.1-8b-instruct": {
    in: 0.18,
    out: 0.18,
    label: "Llama 3.1 8B",
  },
  // Ollama local models (free)
  "qwen2.5:0.5b": { in: 0, out: 0, label: "Qwen 2.5 0.5B (local)" },
  "qwen2.5:3b": { in: 0, out: 0, label: "Qwen 2.5 3B (local)" },
  "qwen2.5:7b": { in: 0, out: 0, label: "Qwen 2.5 7B (local)" },
  "gemma3:latest": { in: 0, out: 0, label: "Gemma3 (local)" },
  "gemma3:4b": { in: 0, out: 0, label: "Gemma3 4B (local)" },
  "llama3.2:3b": { in: 0, out: 0, label: "Llama 3.2 3B (local)" },
};

const UNKNOWN_MODEL_PRICING = { in: 0.5, out: 1.5, label: "" };

function getPricing(model: string) {
  if (!model) return { ...UNKNOWN_MODEL_PRICING, label: model || "Unknown" };
  // Exact match
  if (TOKEN_PRICING[model]) return TOKEN_PRICING[model];
  // Prefix match for Ollama variants (e.g. "qwen2.5:latest")
  const prefix = model.split(":")[0];
  const match = Object.entries(TOKEN_PRICING).find(([k]) =>
    k.startsWith(prefix),
  );
  if (match) return { ...match[1], label: match[1].label };
  return { ...UNKNOWN_MODEL_PRICING, label: model };
}

function calcCost(tokensIn: number, tokensOut: number, model: string): number {
  const p = getPricing(model);
  return (tokensIn / 1_000_000) * p.in + (tokensOut / 1_000_000) * p.out;
}

export interface ModelUsage {
  model: string;
  label: string;
  executions: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  isLocal: boolean;
}

export interface TenantUsage {
  tenantId: string;
  executions: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface MonthlyUsage {
  month: string; // "Ene 2026"
  executions: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface BillingData {
  isAdmin: boolean;
  totalExecutions: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  byModel: ModelUsage[];
  byTenant: TenantUsage[]; // admin only
  byMonth: MonthlyUsage[];
  tenantIds: string[];
}

export async function getBillingData(
  filterTenantId?: string,
): Promise<BillingData | null> {
  try {
    const session = await auth();
    if (!session?.user) return null;

    const apiKey = (session.user as any)?.apiKey as string | undefined;
    if (!apiKey) return null;

    const userRole =
      ((session.user as any)?.role as string | undefined)?.toUpperCase() ?? "";
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "ANALISTA"].includes(userRole);

    const client = saasClientFor(apiKey);

    // Fetch all traces (admin gets all, others get own)
    let traces: any[] = [];
    try {
      if (isAdmin) {
        const res = await client.agent.tracesAdmin({
          limit: 500,
          tenantId: filterTenantId,
        });
        traces = Array.isArray(res) ? res : [];
      } else {
        const res = await client.agent.traces();
        traces = Array.isArray(res) ? res : [];
      }
    } catch {
      traces = [];
    }

    // Aggregate by model
    const modelMap: Record<string, ModelUsage> = {};
    const tenantMap: Record<string, TenantUsage> = {};
    const monthMap: Record<string, MonthlyUsage> = {};

    for (const trace of traces) {
      const model: string = trace.metadata?.model || "unknown";
      const tokIn: number = trace.metadata?.tokens_in ?? trace.tokens_in ?? 0;
      const tokOut: number =
        trace.metadata?.tokens_out ?? trace.tokens_out ?? 0;
      const cost = calcCost(tokIn, tokOut, model);
      const tenantId: string = trace.tenant_id || "";

      // --- by model ---
      if (!modelMap[model]) {
        const p = getPricing(model);
        modelMap[model] = {
          model,
          label: p.label || model,
          executions: 0,
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
          isLocal: p.in === 0 && p.out === 0,
        };
      }
      modelMap[model].executions++;
      modelMap[model].tokensIn += tokIn;
      modelMap[model].tokensOut += tokOut;
      modelMap[model].costUsd += cost;

      // --- by tenant (admin only) ---
      if (isAdmin && tenantId) {
        if (!tenantMap[tenantId]) {
          tenantMap[tenantId] = {
            tenantId,
            executions: 0,
            tokensIn: 0,
            tokensOut: 0,
            costUsd: 0,
          };
        }
        tenantMap[tenantId].executions++;
        tenantMap[tenantId].tokensIn += tokIn;
        tenantMap[tenantId].tokensOut += tokOut;
        tenantMap[tenantId].costUsd += cost;
      }

      // --- by month ---
      const dateStr = trace.created_at
        ? new Date(trace.created_at).toLocaleDateString("es-ES", {
            month: "short",
            year: "numeric",
          })
        : "Desconocido";
      if (!monthMap[dateStr]) {
        monthMap[dateStr] = {
          month: dateStr,
          executions: 0,
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
        };
      }
      monthMap[dateStr].executions++;
      monthMap[dateStr].tokensIn += tokIn;
      monthMap[dateStr].tokensOut += tokOut;
      monthMap[dateStr].costUsd += cost;
    }

    const byModel = Object.values(modelMap).sort(
      (a, b) => b.costUsd - a.costUsd,
    );
    const byTenant = Object.values(tenantMap).sort(
      (a, b) => b.costUsd - a.costUsd,
    );
    // Keep last 6 months
    const byMonth = Object.values(monthMap).slice(-6);
    const tenantIds = Object.keys(tenantMap);

    const totalTokensIn = byModel.reduce((s, m) => s + m.tokensIn, 0);
    const totalTokensOut = byModel.reduce((s, m) => s + m.tokensOut, 0);
    const totalCostUsd = byModel.reduce((s, m) => s + m.costUsd, 0);

    return {
      isAdmin,
      totalExecutions: traces.length,
      totalTokensIn,
      totalTokensOut,
      totalCostUsd,
      byModel,
      byTenant,
      byMonth,
      tenantIds,
    };
  } catch (err) {
    console.error("[getBillingData]", err);
    return null;
  }
}
