"use client";

import { AgentDetails } from "@/app/actions/agent";

interface Props { agent: AgentDetails; }

export default function AgentOverview({ agent }: Props) {
  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Información General</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">ID del Agente</p>
            <p className="font-mono text-sm bg-gray-50 p-2 rounded text-gray-700">{agent.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Tipo</p>
            <p className="font-semibold text-gray-900">{agent.type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Creado</p>
            <p className="text-gray-700">{new Date(agent.createdAt).toLocaleDateString("es-AR")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Modelo</p>
            <p className="font-semibold text-gray-900">{agent.config.model}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Descripción</h3>
        <p className="text-gray-700 leading-relaxed">{agent.description}</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Parámetros del Modelo</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Temperature</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(agent.config.temperature / 2) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-gray-900 text-sm">{agent.config.temperature}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Max Tokens</p>
            <p className="font-semibold text-gray-900">{agent.config.maxTokens.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Prompt del Sistema</h3>
        {agent.config.prompt ? (
          <pre className="text-sm bg-gray-50 p-4 rounded-lg font-mono whitespace-pre-wrap text-gray-700 border border-gray-200 overflow-auto max-h-64">
            {agent.config.prompt}
          </pre>
        ) : (
          <p className="text-gray-500 text-sm">Sin prompt configurado</p>
        )}
      </div>
    </div>
  );
}
