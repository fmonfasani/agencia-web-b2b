"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    Database,
    Cpu,
    Cloud,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    History,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Zap
} from "lucide-react";
import VpsMetricsCharts from "./VpsMetricsCharts";

interface HealthData {
    status: string;
    uptime: number;
    checks: {
        database: boolean;
        redis: boolean;
        openai: boolean;
    };
}

interface FinOpsData {
    total_month_cost: number;
    projection_end_month: number;
    budget: number;
    by_api: Record<string, number>;
    by_tenant: Record<string, number>;
    alerts: string[];
    recent_logs: any[];
    sli?: {
        success_rate: number;
        avg_latency: number;
        extraction_count: number;
    };
}

export default function ObservabilityDashboard() {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [finops, setFinops] = useState<FinOpsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const [hRes, fRes] = await Promise.all([
                fetch("/api/health"),
                fetch("/api/admin/finops")
            ]);
            const hData = await hRes.json();
            const fData = await fRes.json();
            setHealth(hData);
            setFinops(fData);
        } catch (error) {
            console.error("Error fetching observability data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Auto-refresh every minute
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const statusColor = (s: string) => s === "up" || s === "healthy" ? "text-emerald-500" : "text-rose-500";
    const bgStatusColor = (s: string) => s === "up" || s === "healthy" ? "bg-emerald-50" : "bg-rose-50";

    return (
        <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-600 w-8 h-8" />
                        Centro de Observabilidad
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Monitoreo SRE & FinOps en tiempo real</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all font-semibold text-slate-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Sincronizando...' : 'Actualizar'}
                </button>
            </div>

            {/* Alertas Críticas */}
            {finops?.alerts && finops.alerts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start gap-4 shadow-sm"
                >
                    <AlertTriangle className="text-rose-600 shrink-0 w-6 h-6 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="text-rose-800 font-bold uppercase text-xs tracking-wider">Alertas FinOps</h3>
                        <ul className="mt-1 space-y-1">
                            {finops.alerts.map((alert, i) => (
                                <li key={i} className="text-rose-700 text-sm font-medium">• {alert}</li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            )}

            {/* Grid de Estado del Sistema & SLIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { icon: Database, label: "Database", status: health?.checks.database ? 'up' : 'down', sub: "PostgreSQL" },
                    { icon: Cpu, label: "Redis", status: health?.checks.redis ? 'up' : 'down', sub: "Cache & Limit" },
                    {
                        icon: Zap,
                        label: "SLI: Success Rate",
                        status: (finops?.sli?.success_rate || 0) > 95 ? 'healthy' : 'warning',
                        value: `${finops?.sli?.success_rate.toFixed(1)}%`,
                        sub: "Extraction Success"
                    },
                    {
                        icon: History,
                        label: "SLI: Latency",
                        status: (finops?.sli?.avg_latency || 0) < 5 ? 'healthy' : 'warning',
                        value: `${finops?.sli?.avg_latency.toFixed(2)}s`,
                        sub: "Avg Processing"
                    }
                ].map((item, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -4 }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5"
                    >
                        <div className={`p-4 rounded-xl ${item.status === 'healthy' || item.status === 'up' ? 'bg-emerald-50' :
                            item.status === 'warning' ? 'bg-amber-50' : 'bg-rose-50'
                            }`}>
                            <item.icon className={
                                item.status === 'healthy' || item.status === 'up' ? 'text-emerald-500' :
                                    item.status === 'warning' ? 'text-amber-500' : 'text-rose-500'
                            } />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">{item.label}</span>
                            </div>
                            <p className="text-xl font-black text-slate-800 leading-tight">
                                {(item as any).value || item.status?.toUpperCase()}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-widest">{item.sub}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* FinOps Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Costos Principales */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <DollarSign className="text-blue-500" />
                            Presupuesto FinOps
                        </h2>
                        <div className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-tighter">Budget: ${finops?.budget.toFixed(2)} USD</div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Gasto este mes</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">${finops?.total_month_cost.toFixed(4)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                                Proyección <TrendingUp size={10} className="text-amber-500" />
                            </p>
                            <p className={`text-4xl font-black tracking-tighter ${finops && finops.projection_end_month > finops.budget ? 'text-rose-600' : 'text-amber-500'}`}>
                                ${finops?.projection_end_month.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-3 pt-4">
                        <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            <span>Utilización del presupuesto</span>
                            <span>{((finops?.total_month_cost || 0) / (finops?.budget || 1) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(((finops?.total_month_cost || 0) / (finops?.budget || 1) * 100), 100)}%` }}
                                className={`h-full rounded-full ${((finops?.total_month_cost || 0) / (finops?.budget || 1)) > 0.8 ? 'bg-gradient-to-r from-rose-400 to-rose-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Breakdown by API */}
                    <div className="grid grid-cols-2 gap-4 pt-6">
                        {Object.entries(finops?.by_api || {}).map(([api, cost], idx) => (
                            <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{api}</span>
                                <span className="text-lg font-black text-slate-800">${cost.toFixed(4)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Audit Log Table */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <History className="text-blue-500" />
                            Live Audit Log
                        </h2>
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase">Real-time (Last 10 events)</span>
                    </div>

                    <div className="flex-1 overflow-auto admin-scroll">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white">
                                <tr className="border-b border-slate-100">
                                    <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora</th>
                                    <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">API</th>
                                    <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Costo USD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {finops?.recent_logs.map((log, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                                        <td className="py-4 text-xs font-medium text-slate-500">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800 leading-none mb-1">{log.api}</span>
                                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{log.tenant?.name || 'Global'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right">
                                            <span className="text-sm font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                                                ${log.costUsd.toFixed(6)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* VPS Hardware Metrics (Time-Series) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Cpu className="text-slate-800" size={24} />
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Rendimiento de Servidor (VPS)</h2>
                </div>
                <VpsMetricsCharts />
            </div>

            {/* Footer Branding SRE */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] pt-8">
                <div className="flex items-center gap-2">
                    <Zap size={12} fill="currentColor" />
                    Powered by Agencia B2B SRE Engine
                </div>
                <div>v1.0.0-Stable</div>
            </div>
        </div>
    );
}
