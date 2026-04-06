"use client";

import { Badge } from "@/components/ui/badge";
import { Activity, Database, Zap } from "lucide-react";

interface HealthStatus {
  PostgreSQL: boolean;
  Qdrant: boolean;
  Ollama: boolean;
  Redis?: boolean;
}

interface SystemHealthProps {
  status?: HealthStatus;
  loading?: boolean;
}

export function SystemHealth({
  status = {
    PostgreSQL: true,
    Qdrant: true,
    Ollama: true,
    Redis: true,
  },
  loading = false,
}: SystemHealthProps) {
  const services = [
    { name: "PostgreSQL", icon: Database, status: status.PostgreSQL },
    { name: "Qdrant", icon: Zap, status: status.Qdrant },
    { name: "Ollama", icon: Activity, status: status.Ollama },
    { name: "Redis", icon: Activity, status: status.Redis ?? true },
  ];

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Estado del Sistema</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {services.map((service) => (
          <div key={service.name} className="flex flex-col items-center">
            <service.icon
              size={24}
              className={`mb-2 ${
                loading
                  ? "text-gray-400"
                  : service.status
                    ? "text-green-600"
                    : "text-red-600"
              }`}
            />
            <span className="text-sm font-medium text-gray-600 mb-2">
              {service.name}
            </span>
            {loading ? (
              <div className="h-6 w-12 bg-gray-300 rounded animate-pulse" />
            ) : (
              <Badge variant={service.status ? "default" : "destructive"}>
                {service.status ? "✓ Online" : "✗ Offline"}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
