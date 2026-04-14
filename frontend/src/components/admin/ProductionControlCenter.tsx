"use client";

import { useEffect, useMemo, useState } from "react";

interface TenantOption {
  id: string;
  name: string;
  status: string;
  role: string;
  onboardingDone: boolean;
}

interface DashboardState {
  loading: boolean;
  error: string | null;
  activeTenantId: string;
  tenants: TenantOption[];
  analytics: any;
  usage: any;
  billing: any;
  apiKeys: any[];
  agents: any[];
}

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    window.location.href = "/es/auth/sign-in";
    throw new Error("Unauthorized");
  }
  if (response.status === 403) throw new Error("No tienes permisos para esta operación.");
  if (response.status === 429) throw new Error("Quota excedida. Intentá nuevamente en unos minutos.");
  if (response.status >= 500) throw new Error("Error interno del servidor.");
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error || `HTTP ${response.status}`);
  return json;
}

export default function ProductionControlCenter() {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    activeTenantId: "",
    tenants: [],
    analytics: null,
    usage: null,
    billing: null,
    apiKeys: [],
    agents: [],
  });
  const [manualTest, setManualTest] = useState({ agentId: "", query: "test de producción" });
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const activeTenant = useMemo(
    () => state.tenants.find((t) => t.id === state.activeTenantId),
    [state.activeTenantId, state.tenants],
  );

  const load = async (tenantId?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const tenants = await fetchJson(`/api/tenants${tenantId ? `?tenantId=${tenantId}` : ""}`);
      const currentTenantId = tenants.activeTenantId;
      const [analytics, usage, billing, apiKeys, agents] = await Promise.all([
        fetchJson(`/api/analytics?tenantId=${currentTenantId}`),
        fetchJson(`/api/usage?tenantId=${currentTenantId}`),
        fetchJson(`/api/billing?tenantId=${currentTenantId}`),
        fetchJson(`/api/api-keys?tenantId=${currentTenantId}`),
        fetchJson("/api/agents"),
      ]);
      setState({
        loading: false,
        error: null,
        activeTenantId: currentTenantId,
        tenants: tenants.tenants,
        analytics,
        usage,
        billing,
        apiKeys: apiKeys.keys || [],
        agents: agents.agents || [],
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Error inesperado",
      }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runAdminAction = async (action: string, target: string) => {
    await fetchJson("/es/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, target }),
    });
  };

  const runManualTest = async () => {
    await fetchJson("/api/agents/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: state.activeTenantId,
        agentId: manualTest.agentId,
        query: manualTest.query,
      }),
    });
    await load(state.activeTenantId);
  };

  const createApiKey = async (agentId: string) => {
    const data = await fetchJson("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: state.activeTenantId, agentId, label: `key-${Date.now()}` }),
    });
    setCreatedKey(data.rawKey);
    await load(state.activeTenantId);
  };

  const revokeApiKey = async (id: string) => {
    await fetchJson(`/api/api-keys?id=${id}`, { method: "DELETE" });
    await load(state.activeTenantId);
  };

  if (state.loading) return <div className="rounded-lg border bg-white p-6">Cargando dashboard real…</div>;
  if (state.error) return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-600">{state.error}</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-2 text-sm font-medium text-gray-500">Tenant activo (impersonation)</div>
        <div className="flex gap-3">
          <select
            className="rounded border px-3 py-2"
            value={state.activeTenantId}
            onChange={(e) => load(e.target.value)}
          >
            {state.tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} ({tenant.role})
              </option>
            ))}
          </select>
          <button className="rounded bg-slate-900 px-3 py-2 text-white" onClick={() => load(state.activeTenantId)}>
            Refrescar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-white p-4"><p className="text-xs text-gray-500">Total tenants</p><p className="text-2xl font-semibold">{state.analytics.global.totalTenants}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-xs text-gray-500">Total executions</p><p className="text-2xl font-semibold">{state.analytics.global.totalExecutions}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-xs text-gray-500">Total tokens</p><p className="text-2xl font-semibold">{state.analytics.global.totalTokens}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-xs text-gray-500">Total revenue</p><p className="text-2xl font-semibold">${Number(state.analytics.global.totalRevenue).toFixed(2)}</p></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-2 font-semibold">Top tenants</h3>
          {state.analytics.global.topTenants.map((tenant: any) => (
            <div key={tenant.tenantId} className="flex justify-between text-sm py-1">
              <span>{tenant.name}</span><span>{tenant.executions} exec</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-2 font-semibold">Tenant metrics ({activeTenant?.name})</h3>
          <p className="text-sm">Success/Error: {state.analytics.tenant.successRate}% / {state.analytics.tenant.errorRate}%</p>
          <p className="text-sm">Costo mensual: ${Number(state.analytics.tenant.monthlyCostUsd).toFixed(2)}</p>
          <p className="text-sm">Quota: {state.analytics.tenant.quota.usedExecutions}/{state.analytics.tenant.quota.limitExecutions}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="font-semibold">Agentes</h3>
        <div className="space-y-2 mt-3">
          {state.agents.map((agent: any) => (
            <div key={agent.id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-gray-500">Estado: {agent.active ? "Activo" : "Inactivo"}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded border px-2 py-1 text-xs" onClick={() => runAdminAction("agent_restart", agent.id)}>Reiniciar</button>
                  <button className="rounded border px-2 py-1 text-xs" onClick={() => runAdminAction("agent_retrain", agent.id)}>Reentrenar</button>
                  <button className="rounded border px-2 py-1 text-xs" onClick={() => runAdminAction("agent_prompt_update", agent.id)}>Modificar prompt</button>
                  <button className="rounded bg-slate-900 text-white px-2 py-1 text-xs" onClick={() => createApiKey(agent.id)}>Crear API Key</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <select className="rounded border px-2 py-1" value={manualTest.agentId} onChange={(e) => setManualTest((v) => ({ ...v, agentId: e.target.value }))}>
            <option value="">Seleccionar agente</option>
            {state.agents.map((agent: any) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
          <input className="rounded border px-2 py-1 flex-1" value={manualTest.query} onChange={(e) => setManualTest((v) => ({ ...v, query: e.target.value }))} />
          <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={runManualTest}>Test manual</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <h3 className="font-semibold mb-2">API Keys</h3>
          {createdKey && <p className="text-xs text-green-700 mb-2">Nueva key (copiala ahora): {createdKey}</p>}
          {state.apiKeys.map((key: any) => (
            <div key={key.id} className="flex justify-between py-1 text-sm">
              <span>{key.label} · {key.agentName} · {key.active ? "Activa" : "Revocada"}</span>
              {key.active && <button className="text-red-600" onClick={() => revokeApiKey(key.id)}>Revocar</button>}
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h3 className="font-semibold mb-2">Billing</h3>
          <p className="text-sm">Plan: {state.billing.current.plan}</p>
          <p className="text-sm">Consumo actual: ${Number(state.billing.current.estimatedCostUsd).toFixed(2)}</p>
          <p className="text-sm">Límites: agentes {state.billing.limits.maxAgents}, usuarios {state.billing.limits.maxUsers}</p>
          <p className="text-sm">Histórico: {state.billing.history.length} pagos</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="font-semibold mb-2">Usage</h3>
        {state.usage.byAgent.map((row: any) => (
          <div key={row.agent} className="flex justify-between text-sm py-1">
            <span>{row.agent}</span>
            <span>{row.executions} ejecuciones · {row.tokens} tokens · {row.avgLatencyMs}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
