"use client";

/**
 * hooks/useAgents.ts
 *
 * Client hook for agent instances + templates.
 * Uses saas-client via session API key — no direct DB access.
 *
 * Usage:
 *   const { instances, templates, loading, createInstance, archiveInstance } = useAgents();
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  saasClientFor,
  type AgentInstance,
  type AgentTemplate,
  type AgentInstanceCreate,
  type AgentInstanceUpdate,
} from "@/lib/saas-client";

interface UseAgentsState {
  instances: AgentInstance[];
  templates: AgentTemplate[];
  loading: boolean;
  error: string | null;
  /** Create a new instance from a template. Returns the created instance. */
  createInstance: (
    payload: AgentInstanceCreate,
  ) => Promise<AgentInstance | null>;
  /** Soft-archive an instance by ID. */
  archiveInstance: (instanceId: string) => Promise<boolean>;
  /** Update an instance name, custom_prompt, or overrides. */
  updateInstance: (
    instanceId: string,
    patch: AgentInstanceUpdate,
  ) => Promise<AgentInstance | null>;
  /** Reload instances + templates from the server. */
  refresh: () => void;
}

export function useAgents(): UseAgentsState {
  const { data: session } = useSession();
  const apiKey = (session?.user as any)?.apiKey as string | undefined;

  const [instances, setInstances] = useState<AgentInstance[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    const client = saasClientFor(apiKey);
    const [instRes, tplRes] = await Promise.allSettled([
      client.instances.list({ status: "active" }),
      client.templates.list(),
    ]);
    if (instRes.status === "fulfilled") setInstances(instRes.value ?? []);
    else setError("Error al cargar agentes");
    if (tplRes.status === "fulfilled") setTemplates(tplRes.value ?? []);
    setLoading(false);
  }, [apiKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createInstance = useCallback(
    async (payload: AgentInstanceCreate): Promise<AgentInstance | null> => {
      if (!apiKey) return null;
      try {
        const client = saasClientFor(apiKey);
        const inst = await client.instances.create(payload);
        setInstances((prev) => [inst, ...prev]);
        return inst;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear agente");
        return null;
      }
    },
    [apiKey],
  );

  const archiveInstance = useCallback(
    async (instanceId: string): Promise<boolean> => {
      if (!apiKey) return false;
      try {
        const client = saasClientFor(apiKey);
        await client.instances.archive(instanceId);
        setInstances((prev) => prev.filter((i) => i.id !== instanceId));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al archivar agente");
        return false;
      }
    },
    [apiKey],
  );

  const updateInstance = useCallback(
    async (
      instanceId: string,
      patch: AgentInstanceUpdate,
    ): Promise<AgentInstance | null> => {
      if (!apiKey) return null;
      try {
        const client = saasClientFor(apiKey);
        const updated = await client.instances.update(instanceId, patch);
        setInstances((prev) =>
          prev.map((i) => (i.id === instanceId ? { ...i, ...updated } : i)),
        );
        return updated;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar agente");
        return null;
      }
    },
    [apiKey],
  );

  return {
    instances,
    templates,
    loading,
    error,
    createInstance,
    archiveInstance,
    updateInstance,
    refresh: fetchAll,
  };
}

// ── Selector helpers ──────────────────────────────────────────────────────────

/** Returns only active instances */
export function useActiveInstances(
  instances: AgentInstance[],
): AgentInstance[] {
  return instances.filter((i) => i.status === "active");
}

/** Lookup a template by its ID */
export function useTemplateById(
  templates: AgentTemplate[],
  templateId: string | undefined,
): AgentTemplate | undefined {
  return templates.find((t) => t.id === templateId);
}
