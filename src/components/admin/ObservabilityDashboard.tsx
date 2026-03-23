"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    RefreshCw,
    Shield,
    Zap,
    LayoutDashboard
} from "lucide-react";
import ObservabilityOverview from "./ObservabilityOverview";
import RumMetrics from "./RumMetrics";
import AuditorTab from "./AuditorTab";

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

type TabType = "overview" | "rum" | "auditor";

export default function ObservabilityDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>("overview");
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
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Iniciando Centro de Control...</p>
            </div>
        );
    }

    const tabs: { id: TabType; label: string; icon: any }[] = [
        { id: "overview", label: "Estructura & FinOps", icon: LayoutDashboard },
        { id: "rum", label: "Experiencia (RUM)", icon: Zap },
        { id: "auditor", label: "AI Software Auditor", icon: Shield },
    ];

    return (
        <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-600 w-8 h-8" />
                        Centro de Observabilidad
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Webshooks SRE Engine • v1.0.0-Stable</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === tab.id
                                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={fetchData}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all font-bold text-sm disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Sincronizando...' : 'Actualizar'}
                </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === "overview" && (
                        <ObservabilityOverview health={health} finops={finops} />
                    )}
                    {activeTab === "rum" && (
                        <RumMetrics />
                    )}
                    {activeTab === "auditor" && (
                        <AuditorTab />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Footer Branding SRE */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] pt-8">
                <div className="flex items-center gap-2">
                    <Zap size={12} fill="currentColor" />
                    Powered by Webshooks SRE Engine
                </div>
                <div>Deep Observability Stack</div>
            </div>
        </div>
    );
}
