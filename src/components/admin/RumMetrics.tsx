"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Activity, BarChart3, Clock, Layout, MousePointer2 } from "lucide-react";

interface RumMetricData {
    page: string;
    metric: string;
    count: number;
    p50: number;
    p75: number;
    p95: number;
}

export default function RumMetrics() {
    const [data, setData] = useState<RumMetricData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRum = async () => {
        try {
            const res = await fetch("/api/rum/summary");
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error("Failed to fetch RUM summary:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRum();
        const interval = setInterval(fetchRum, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando métricas RUM...</div>;

    const getStatus = (metric: string, value: number) => {
        if (metric === "LCP") return value < 2500 ? "GOOD" : value < 4000 ? "NEEDS_IMPROVEMENT" : "POOR";
        if (metric === "CLS") return value < 0.1 ? "GOOD" : value < 0.25 ? "NEEDS_IMPROVEMENT" : "POOR";
        if (metric === "INP") return value < 200 ? "GOOD" : value < 500 ? "NEEDS_IMPROVEMENT" : "POOR";
        return "GOOD";
    };

    const getStatusColor = (status: string) => {
        if (status === "GOOD") return "text-emerald-500 bg-emerald-50 border-emerald-100";
        if (status === "NEEDS_IMPROVEMENT") return "text-amber-500 bg-amber-50 border-amber-100";
        return "text-rose-500 bg-rose-50 border-rose-100";
    };

    const getMetricIcon = (metric: string) => {
        if (metric === "LCP") return Clock;
        if (metric === "CLS") return Layout;
        if (metric === "INP") return MousePointer2;
        return BarChart3;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Zap size={20} className="text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Experiencia de Usuario (RUM)</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Web Vitals en Tiempo Real (p95)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.length === 0 ? (
                    <div className="col-span-full bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
                        <p className="text-slate-400 font-medium italic">No hay eventos RUM registrados en las últimas 24h.</p>
                    </div>
                ) : (
                    data.map((item, idx) => {
                        const Icon = getMetricIcon(item.metric);
                        const status = getStatus(item.metric, item.p95);
                        const metaColors = getStatusColor(status);

                        return (
                            <motion.div
                                key={`${item.page}-${item.metric}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${metaColors}`}>
                                        {status.replace("_", " ")}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`p-3 rounded-2xl ${item.metric === 'LCP' ? 'bg-orange-50 text-orange-500' : item.metric === 'CLS' ? 'bg-indigo-50 text-indigo-500' : 'bg-pink-50 text-pink-50'}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">
                                            {item.p95}{item.metric === 'CLS' ? '' : 'ms'}
                                        </h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{item.metric}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Página</span>
                                        <span className="text-slate-700 font-black truncate max-w-[120px]">{item.page}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Eventos</span>
                                        <span className="text-slate-700 font-black">{item.count}</span>
                                    </div>

                                    <div className="pt-2 flex gap-2">
                                        <div className="flex-1 bg-slate-50 p-2 rounded-xl text-center">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">p50</p>
                                            <p className="font-black text-slate-600 text-xs">{item.p50}</p>
                                        </div>
                                        <div className="flex-1 bg-slate-50 p-2 rounded-xl text-center">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">p75</p>
                                            <p className="font-black text-slate-600 text-xs">{item.p75}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
