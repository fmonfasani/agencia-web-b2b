"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface MetricsData {
  date: string;
  queries: number;
  avgDuration: number;
  errorRate: number;
}

interface TopClientsData {
  name: string;
  mrr: number;
}

interface AgentMetricsChartProps {
  metricsData: MetricsData[];
  topClientsData: TopClientsData[];
  loading?: boolean;
}

export function AgentMetricsChart({
  metricsData,
  topClientsData,
  loading = false,
}: AgentMetricsChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LineChart: Queries últimos 30 días */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Queries (últimos 30 días)
        </h3>
        {loading ? (
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="queries"
                stroke="#0066FF"
                dot={false}
                name="Queries"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* BarChart: Top Clientes */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Top 5 Clientes por MRR
        </h3>
        {loading ? (
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topClientsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="mrr" fill="#10B981" name="MRR ($)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* LineChart: Latencia promedio */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Latencia Promedio (ms)
        </h3>
        {loading ? (
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgDuration"
                stroke="#FBBF24"
                dot={false}
                name="Latencia (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* LineChart: Error Rate */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Error Rate (%)</h3>
        {loading ? (
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="errorRate"
                stroke="#EF4444"
                dot={false}
                name="Error Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
