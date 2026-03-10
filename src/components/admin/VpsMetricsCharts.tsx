"use client";

import React, { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";
import { Activity, Cpu, HardDrive, Wifi, Clock } from "lucide-react";

interface MetricData {
    timestamp: string;
    cpuUsage: number;
    memUsage: number;
    diskUsage: number;
    netIn: number;
    netOut: number;
    loadAvg1: number | null;
    loadAvg5: number | null;
    loadAvg15: number | null;
}

const periods = [
    { label: "1h", value: "1h" },
    { label: "6h", value: "6h" },
    { label: "24h", value: "24h" },
    { label: "7d", value: "7d" },
    { label: "3m", value: "3m" },
];

export default function VpsMetricsCharts() {
    const [data, setData] = useState<MetricData[]>([]);
    const [period, setPeriod] = useState("1h");
    const [loading, setLoading] = useState(true);

    const fetchMetrics = async () => {
        try {
            const res = await fetch(`/api/admin/metrics/vps?period=${period}`);
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error("Error fetching metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 60000);
        return () => clearInterval(interval);
    }, [period]);

    const formatTime = (timeStr: any) => {
        const date = new Date(timeStr);
        if (period === "1h" || period === "6h") {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
    };

    const formatBytes = (bytes: any) => {
        const val = parseFloat(bytes);
        if (isNaN(val) || val === 0) return "0 B/s";
        const k = 1024;
        const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
        const i = Math.floor(Math.log(val) / Math.log(k));
        return parseFloat((val / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const ChartCard = ({ title, icon: Icon, children, color }: any) => (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Icon className={color} size={18} />
                    {title}
                </h3>
            </div>
            <div className="h-[200px] w-full">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-2xl animate-pulse">
                        <span className="text-xs font-bold text-slate-300 uppercase">Cargando datos...</span>
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase">Sin datos en este periodo</span>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <Clock className="text-blue-500" size={18} />
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-tighter">Rango de Tiempo</span>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {periods.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${period === p.value
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CPU Chart */}
                <ChartCard title="Uso de CPU (%)" icon={Cpu} color="text-amber-500">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                labelFormatter={(label) => formatTime(label)}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="cpuUsage" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Memory Chart */}
                <ChartCard title="Uso de Memoria (%)" icon={Activity} color="text-emerald-500">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                labelFormatter={(label) => formatTime(label)}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="memUsage" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMem)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Network Bandwidth Chart */}
                <ChartCard title="Ancho de Banda (In/Out)" icon={Wifi} color="text-blue-500">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={formatBytes}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                labelFormatter={(label) => formatTime(label)}
                                formatter={(value) => formatBytes(value)}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line type="monotone" dataKey="netIn" name="Download" stroke="#3b82f6" strokeWidth={3} dot={false} />
                            <Line type="monotone" dataKey="netOut" name="Upload" stroke="#ef4444" strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Disk Usage Chart */}
                <ChartCard title="Uso de Disco (%)" icon={HardDrive} color="text-indigo-500">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                labelFormatter={(label) => formatTime(label)}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="diskUsage" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorDisk)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Load Average Chart */}
                <ChartCard title="Carga del Sistema (Load)" icon={Activity} color="text-rose-500">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatTime}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                label={{ value: 'Promedio', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                            />
                            <Tooltip
                                labelFormatter={(label) => formatTime(label)}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line type="monotone" dataKey="loadAvg1" name="1m" stroke="#ef4444" strokeWidth={3} dot={false} />
                            <Line type="monotone" dataKey="loadAvg5" name="5m" stroke="#f59e0b" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="loadAvg15" name="15m" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
}
