"use client";

import { useState } from "react";
import { AgentDetails, updateAgentConfig } from "@/app/actions/agent";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/useToast";

interface Props { agent: AgentDetails; agentId: string; }

export default function AgentConfiguration({ agent, agentId }: Props) {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    prompt: agent.config.prompt,
    temperature: agent.config.temperature,
    maxTokens: agent.config.maxTokens,
  });

  const handleSave = async () => {
    const apiKey = (session?.user as any)?.apiKey;
    if (!apiKey) return;

    setIsSaving(true);
    try {
      const res = await updateAgentConfig(agentId, apiKey, form);
      if (res.success) {
        addToast("Configuración actualizada", "success");
        setIsEditing(false);
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Configuración del Agente</h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Editar
            </button>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt del Sistema
            </label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              disabled={!isEditing}
              rows={6}
              className="w-full p-3 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature (0–2)
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Menor = más determinista. Mayor = más creativo.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Límite máximo de tokens en la respuesta.</p>
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setForm({ prompt: agent.config.prompt, temperature: agent.config.temperature, maxTokens: agent.config.maxTokens });
                }}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
