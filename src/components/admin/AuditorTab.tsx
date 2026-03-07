"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Search,
    Github,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Clock,
    BarChart,
    FileText,
    ExternalLink,
    RefreshCw
} from "lucide-react";

interface AuditResult {
    id: string;
    repositoryUrl: string;
    status: string;
    overallScore: number | null;
    architectureScore: number | null;
    securityScore: number | null;
    codeQualityScore: number | null;
    devopsScore: number | null;
    summary: string | null;
    createdAt: string;
}

export default function AuditorTab() {
    const [repoUrl, setRepoUrl] = useState("");
    const [isStarting, setIsStarting] = useState(false);
    const [audits, setAudits] = useState<AuditResult[]>([]);
    const [selectedAudit, setSelectedAudit] = useState<AuditResult | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAudits = async () => {
        try {
            const res = await fetch("/api/admin/auditor");
            const data = await res.json();
            if (Array.isArray(data)) setAudits(data);
        } catch (error) {
            console.error("Failed to fetch audits:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAudits();
        const interval = setInterval(fetchAudits, 10000); // Polling every 10s
        return () => clearInterval(interval);
    }, []);

    const handleStartAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repoUrl) return;

        setIsStarting(true);
        try {
            const res = await fetch("/api/admin/auditor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repository_url: repoUrl })
            });
            if (res.ok) {
                setRepoUrl("");
                fetchAudits();
            }
        } catch (error) {
            console.error("Error starting audit:", error);
        } finally {
            setIsStarting(false);
        }
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return "text-slate-300";
        if (score >= 80) return "text-emerald-500";
        if (score >= 60) return "text-amber-500";
        return "text-rose-500";
    };

    return (
        <div className="space-y-8">
            {/* Auditor Header & Form */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                                <Shield size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI Software Auditor</h2>
                        </div>
                        <p className="text-slate-500 font-medium italic text-sm">Auditorías técnicas bajo demanda con Claude 3.7 Sonnet</p>
                    </div>

                    <form onSubmit={handleStartAudit} className="flex-1 max-w-xl">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Github className="text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                placeholder="https://github.com/usuario/repo"
                                className="w-full pl-11 pr-32 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold text-slate-700 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isStarting || !repoUrl}
                                className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                {isStarting ? "Iniciando..." : "Analizar"}
                            </button>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-2">Soportarepos públicos de GitHub</p>
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Audits List */}
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                            <Clock size={18} className="text-indigo-500" />
                            Auditorías Recientes
                        </h3>
                    </div>

                    <div className="flex-1 overflow-auto admin-scroll space-y-3">
                        {loading && audits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                                <RefreshCw className="animate-spin" />
                                <span className="text-[10px] font-bold uppercase">Sincronizando...</span>
                            </div>
                        ) : audits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 italic text-sm">
                                No hay auditorías previas.
                            </div>
                        ) : (
                            audits.map((audit) => (
                                <button
                                    key={audit.id}
                                    onClick={() => setSelectedAudit(audit)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all group ${selectedAudit?.id === audit.id
                                            ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-50"
                                            : "bg-slate-50 border-slate-100 hover:border-indigo-200"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`p-1.5 rounded-lg ${audit.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                                                audit.status === 'failed' ? 'bg-rose-100 text-rose-600' :
                                                    'bg-amber-100 text-amber-600'
                                            }`}>
                                            {audit.status === 'completed' ? <CheckCircle2 size={14} /> :
                                                audit.status === 'failed' ? <AlertCircle size={14} /> :
                                                    <RefreshCw size={14} className="animate-spin" />}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400">{new Date(audit.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs font-black text-slate-800 truncate mb-1">{audit.repositoryUrl.split('/').pop()}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${audit.status === 'completed' ? 'bg-indigo-500' : 'bg-amber-400'}`}
                                                style={{ width: audit.status === 'completed' ? '100%' : '40%' }}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-black ${getScoreColor(audit.overallScore)}`}>
                                            {audit.overallScore ? `${Math.round(audit.overallScore)}%` : '--'}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Audit Detail / Report */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[500px] overflow-hidden">
                    <AnimatePresence mode="wait">
                        {selectedAudit ? (
                            <motion.div
                                key={selectedAudit.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full"
                            >
                                {/* Detail Header */}
                                <div className="p-8 border-b border-slate-50 flex justify-between items-start bg-slate-50/50">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-slate-800 leading-tight flex items-center gap-2">
                                            Reporte Tecnico: {selectedAudit.repositoryUrl.split('/').pop()}
                                            <a href={selectedAudit.repositoryUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-500">
                                                <ExternalLink size={16} />
                                            </a>
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {selectedAudit.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Score Global</p>
                                        <p className={`text-4xl font-black leading-none ${getScoreColor(selectedAudit.overallScore)}`}>
                                            {selectedAudit.overallScore ? Math.round(selectedAudit.overallScore) : '--'}<span className="text-sm opacity-50">%</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto p-8 space-y-8 admin-scroll">
                                    {selectedAudit.status !== 'completed' ? (
                                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                                            <div className="p-4 bg-amber-50 rounded-full text-amber-500 animate-pulse">
                                                <Clock size={48} />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Análisis en Progreso</h4>
                                                <p className="text-slate-500 text-sm italic">Estamos revisando arquitectura, seguridad y calidad de código...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Metrics Grid */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                {[
                                                    { label: "Arq.", score: selectedAudit.architectureScore },
                                                    { label: "Seg.", score: selectedAudit.securityScore },
                                                    { label: "Cal.", score: selectedAudit.codeQualityScore },
                                                    { label: "Ops.", score: selectedAudit.devopsScore },
                                                ].map((m, i) => (
                                                    <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</span>
                                                        <span className={`text-xl font-black ${getScoreColor(m.score)}`}>{m.score ? Math.round(m.score) : '--'}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Summary Section */}
                                            <div className="space-y-3">
                                                <h4 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-wider">
                                                    <FileText size={16} className="text-indigo-500" />
                                                    Resumen Estratégico
                                                </h4>
                                                <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-50/50 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                                    {selectedAudit.summary || "No hay resumen disponible para esta auditoría."}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-300">
                                <div className="p-6 bg-slate-50 rounded-full mb-4">
                                    <BarChart size={64} strokeWidth={1} />
                                </div>
                                <h4 className="text-lg font-bold">Selecciona una auditoría</h4>
                                <p className="text-sm">O inicia el análisis de un nuevo repositorio arriba.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
