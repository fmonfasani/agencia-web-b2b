"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "@/app/observability.css";
import {
    Activity,
    Database,
    Cpu,
    Globe,
    Zap,
    Shield,
    Terminal,
    Clock,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    TrendingUp,
    BarChart3,
    Layers,
    ExternalLink,
    ChevronRight,
    Search
} from "lucide-react";

interface Trace {
    id: string;
    traceId: string;
    service: string;
    operation: string;
    duration: number;
    status: string;
    createdAt: string;
}

interface Metric {
    id: string;
    name: string;
    value: number;
    tags: any;
    createdAt: string;
}

interface HealthStatus {
    status: string;
    timestamp: string;
    services: {
        database: { status: string; message?: string };
        redis: { status: string; message?: string };
        agentService: { status: string; details?: any };
    };
}

export default function ObservabilityCommandCenter() {
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [traces, setTraces] = useState<Trace[]>([]);
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedTrace, setSelectedTrace] = useState<string | null>(null);

    const fetchData = async () => {
        setIsRefreshing(true);
        try {
            const [hRes, tRes, mRes] = await Promise.all([
                fetch("/api/observability/health"),
                fetch("/api/observability/traces"),
                fetch("/api/observability/metrics")
            ]);

            if (hRes.ok) setHealth(await hRes.json());
            if (tRes.ok) {
                const data = await tRes.json();
                setTraces(data.traces || []);
            }
            if (mRes.ok) {
                const data = await mRes.json();
                setMetrics(data.metrics || []);
            }
        } catch (error) {
            console.error("Failed to fetch observability data:", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] text-white">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="mb-4"
                >
                    <RefreshCw size={48} className="text-blue-500" />
                </motion.div>
                <h2 className="text-xl font-bold tracking-widest uppercase opacity-50">Iniciando Command Center...</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-6 lg:p-10 font-sans selection:bg-blue-500/30">
            {/* Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full" />
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-emerald-600/5 blur-[80px] rounded-full" />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 max-w-[1600px] mx-auto space-y-8"
            >
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg glow-blue">
                                <Activity className="text-blue-400" size={24} />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
                                SRE <span className="observability-text-gradient">Command Center</span>
                            </h1>
                        </div>
                        <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Monitoreo de Infraestructura Distribuida v2.0
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 observability-glass rounded-xl flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sync Status</p>
                                <p className="text-sm font-mono text-emerald-400">ONLINE</p>
                            </div>
                            <button
                                onClick={fetchData}
                                disabled={isRefreshing}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
                            >
                                <RefreshCw size={18} className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            </button>
                        </div>
                        <div className="h-10 w-[1px] bg-white/10" />
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group">
                            <Terminal size={18} className="text-slate-400 group-hover:text-white transition-colors" />
                            <span className="text-sm font-bold uppercase tracking-widest text-slate-400 group-hover:text-white">Logs CLI</span>
                        </div>
                    </div>
                </div>

                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Health Check */}
                    <motion.div variants={itemVariants} className="observability-glass p-6 rounded-3xl group cursor-help overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Shield size={64} />
                        </div>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">System Health</span>
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white italic">{(health?.status || 'UNKNOWN').toUpperCase()}</h2>
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-500 uppercase tracking-tighter">Database</span>
                                <span className={health?.services.database.status === 'connected' ? 'text-emerald-400' : 'text-rose-400'}>
                                    {health?.services.database.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-500 uppercase tracking-tighter">Agent VPS</span>
                                <span className={health?.services.agentService.status === 'connected' ? 'text-emerald-400' : 'text-rose-400'}>
                                    {health?.services.agentService.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Latency Metric */}
                    <motion.div variants={itemVariants} className="observability-glass p-6 rounded-3xl group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Clock size={64} />
                        </div>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Global Latency</span>
                            <Zap size={16} className="text-amber-500 fill-amber-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-3xl font-black text-white italic">240</h2>
                            <span className="text-sm font-bold text-slate-500">ms</span>
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <TrendingUp size={10} />
                            -12% vs last 24h
                        </div>
                        <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} className="h-full bg-gradient-to-r from-blue-500 to-purple-500 glow-purple" />
                        </div>
                    </motion.div>

                    {/* Extraction Success Rate */}
                    <motion.div variants={itemVariants} className="observability-glass p-6 rounded-3xl group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Layers size={64} />
                        </div>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Lead Conversion</span>
                            <BarChart3 size={16} className="text-blue-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-3xl font-black text-white italic">99.2</h2>
                            <span className="text-sm font-bold text-slate-500">%</span>
                        </div>
                        <p className="mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Success Rate (P99)</p>
                        <div className="mt-4 flex gap-1 h-8 items-end">
                            {[40, 60, 45, 80, 55, 90, 75, 95, 85].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex-1 bg-gradient-to-t from-emerald-500/20 to-emerald-500/60 rounded-t-sm"
                                />
                            ))}
                        </div>
                    </motion.div>

                    {/* API Requests */}
                    <motion.div variants={itemVariants} className="observability-glass p-6 rounded-3xl group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Globe size={64} />
                        </div>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-rose-400">Throughput</span>
                            <Activity size={16} className="text-rose-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white italic">14.2k</h2>
                        <p className="mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Requests / hour</p>
                        <div className="mt-4 p-2 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400">Peak Load</span>
                            <span className="text-[10px] font-mono text-rose-400">1.2 req/s</span>
                        </div>
                    </motion.div>
                </div>

                {/* Main Content Area: Tracing & Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* Distributed Tracing Table (Jaeger Style) */}
                    <motion.div
                        variants={itemVariants}
                        className="xl:col-span-2 observability-glass rounded-[2rem] overflow-hidden flex flex-col h-[600px]"
                    >
                        <div className="p-8 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <Search size={20} className="text-slate-500" />
                                <h3 className="text-xl font-black tracking-tight text-white uppercase italic">Distributed <span className="observability-text-gradient">Tracing</span></h3>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-white/5">Auto-Refresh: ON</span>
                                <span className="px-3 py-1 bg-green-500/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-emerald-400 border border-green-500/20">Real-time</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto observability-scroll">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#0f172a] shadow-xl z-20">
                                    <tr className="border-b border-white/5">
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Trace ID</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Service</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Operation</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Duration</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                                        <th className="p-6"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode="popLayout">
                                        {traces.map((trace) => (
                                            <motion.tr
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                key={trace.id}
                                                onClick={() => setSelectedTrace(trace.traceId === selectedTrace ? null : trace.traceId)}
                                                className={`group border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${selectedTrace === trace.traceId ? 'bg-blue-500/10' : ''}`}
                                            >
                                                <td className="p-6">
                                                    <span className="font-mono text-xs text-blue-400 group-hover:text-blue-300 transition-colors">
                                                        {trace.traceId.substring(0, 8)}...
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${trace.service.includes('frontend') ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'
                                                        }`}>
                                                        {trace.service === 'agencia-web-b2b-frontend' ? 'Frontend' : 'Agent-VPS'}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-sm font-bold text-slate-200">
                                                    {trace.operation}
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-mono font-black ${trace.duration > 2000 ? 'text-rose-400' : trace.duration > 800 ? 'text-amber-400' : 'text-slate-400'
                                                            }`}>
                                                            {trace.duration}ms
                                                        </span>
                                                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                                            <div className="h-full bg-blue-500/50" style={{ width: `${Math.min(trace.duration / 40, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    {trace.status === 'ok' ? (
                                                        <span className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                                            OK
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-rose-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                                                            ERROR
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-6 text-right">
                                                    <ChevronRight className={`text-slate-600 transition-transform ${selectedTrace === trace.traceId ? 'rotate-90 text-white' : ''}`} />
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    {/* Side Panel: Metric Explorer & Business Value */}
                    <div className="space-y-8">
                        {/* Live Metric Explorer */}
                        <motion.div variants={itemVariants} className="observability-glass p-8 rounded-[2rem] space-y-6">
                            <h3 className="text-xl font-black text-white italic tracking-tight uppercase flex items-center gap-2">
                                <BarChart3 className="text-purple-400" />
                                Metric <span className="observability-text-gradient">Explorer</span>
                            </h3>
                            <div className="space-y-4">
                                {metrics.slice(0, 5).map((metric, i) => (
                                    <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-all cursor-default group">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">{metric.name}</span>
                                            <span className="text-[10px] font-mono text-slate-600">{new Date(metric.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-2xl font-black text-white italic">{metric.value}</span>
                                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Unit: count</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full py-4 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-white/5 hover:text-white transition-all">
                                View Full Telemetry
                            </button>
                        </motion.div>

                        {/* Node System State */}
                        <motion.div variants={itemVariants} className="observability-glass p-8 rounded-[2rem] bg-gradient-to-br from-blue-600/10 to-transparent">
                            <div className="flex items-center gap-2 mb-6">
                                <Cpu className="text-blue-400" size={20} />
                                <h3 className="text-xl font-black text-white italic tracking-tight uppercase underline decoration-blue-500/30 decoration-4 underline-offset-4">Server Specs</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CPU Efficiency</p>
                                    <p className="text-2xl font-black text-white">12.4%</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">RAM Usage</p>
                                    <p className="text-2xl font-black text-white">1.2<span className="text-xs ml-1 text-slate-500 italic">GB</span></p>
                                </div>
                                <div className="col-span-2 pt-4">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Memory Pressure</span>
                                        <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest">Ideal</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full">
                                        <div className="h-full w-[35%] bg-blue-500 rounded-full glow-blue" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <span className="text-slate-400">© 2026 Webshooks SRE System</span>
                        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse-slow" />
                        <span>K8s Cluster Node: DO-NYC-01</span>
                    </div>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-blue-400 transition-colors flex items-center gap-2">
                            Infrastructure Docs <ExternalLink size={10} />
                        </a>
                        <a href="#" className="hover:text-blue-400 transition-colors">API Reference</a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
