"use client";

import { AgentMetrics } from "@/app/actions/agent";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface Props { metrics: AgentMetrics[]; agentId: string; }

export default function AgentPerformance({ metrics }: Props) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-12 text-center text-gray-500 bg-white">
        No hay datos de métricas disponibles
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Queries por día</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="queries" stroke="#0066FF" strokeWidth={2} dot={false} name="Queries" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Latencia promedio (ms)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="avgLatency" fill="#10B981" name="Latencia (ms)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Tasa de éxito vs error (%)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="successRate" stroke="#10B981" strokeWidth={2} dot={false} name="Éxito %" />
            <Line type="monotone" dataKey="errorRate" stroke="#EF4444" strokeWidth={2} dot={false} name="Error %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
