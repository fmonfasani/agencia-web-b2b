"use client";

import { Webhook, Zap } from "lucide-react";
import Link from "next/link";

interface Props { agentId: string; }

export default function AgentIntegrations({ agentId }: Props) {
  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Webhook size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Webhooks</h3>
            <p className="text-sm text-gray-500">Notificaciones automáticas para eventos del agente</p>
          </div>
        </div>
        <p className="text-gray-600 mb-4">
          Configura webhooks para recibir notificaciones cuando este agente procese consultas, cambie de estado o supere umbrales de uso.
        </p>
        <Link
          href="../../settings/webhooks"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Webhook size={16} />
          Gestionar Webhooks
        </Link>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Zap size={20} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Integraciones Externas</h3>
            <p className="text-sm text-gray-500">Conecta con herramientas de terceros</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {["Slack", "Microsoft Teams", "Zapier", "Make", "HubSpot", "Salesforce"].map((tool) => (
            <div
              key={tool}
              className="border border-gray-200 rounded-lg p-3 text-center opacity-50"
            >
              <p className="text-sm font-medium text-gray-700">{tool}</p>
              <p className="text-xs text-gray-500 mt-1">Próximamente</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
