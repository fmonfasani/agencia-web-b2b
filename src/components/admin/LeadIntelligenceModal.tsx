"use client";

import React, { useState } from "react";
import {
    X, Zap, Shield, Target, TrendingUp, Search,
    MessageSquare, Mail, Phone, BookOpen, AlertCircle,
    CheckCircle2, Star, Globe, BarChart3, Users,
    ArrowRight, Sparkles, RefreshCw
} from "lucide-react";
import { IntelligenceMarkdown } from "./IntelligenceMarkdown";

interface LeadIntelligenceModalProps {
    lead: any;
    onClose: () => void;
    onReAnalyze: () => void;
    isAnalyzing: boolean;
}

export default function LeadIntelligenceModal({
    lead,
    onClose,
    onReAnalyze,
    isAnalyzing
}: LeadIntelligenceModalProps) {
    const [activeTab, setActiveTab] = useState<"AUDITORÍA" | "ESTRATEGIA" | "MERCADO" | "VENTAS">("AUDITORÍA");
    const intel = lead.intelligence;

    if (!lead) return null;

    const tabs = [
        { id: "AUDITORÍA", icon: Search, label: "Auditoría" },
        { id: "ESTRATEGIA", icon: Target, label: "Estrategia" },
        { id: "MERCADO", icon: TrendingUp, label: "Mercado" },
        { id: "VENTAS", icon: MessageSquare, label: "Ventas" },
    ];

    const StatCard = ({ label, value, icon: Icon, color }: any) => (
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-4">
            <div className={`size-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="text-lg font-black text-slate-900 leading-tight">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-slate-50 w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl border border-white/20 overflow-hidden flex flex-col">
                {/* Header Section */}
                <div className="bg-white px-8 py-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="size-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                            <Zap size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{lead.name}</h2>
                                {intel?.tier && (
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${intel.tier === 'HOT' ? 'bg-red-50 text-red-600 border-red-100' :
                                            intel.tier === 'WARM' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}>
                                        {intel.tier}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 font-medium">Análisis de Mercado & Diagnóstico Digital</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onReAnalyze}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {isAnalyzing ? (
                                <RefreshCw className="animate-spin" size={18} />
                            ) : (
                                <Sparkles size={18} />
                            )}
                            Re-analizar con IA
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Sub-Header Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-8 py-6 bg-white border-b border-slate-100">
                    <StatCard
                        label="Opportunity Score"
                        value={`${intel?.opportunityScore || lead.potentialScore || 0}%`}
                        icon={Target} color="bg-indigo-50 text-indigo-600"
                    />
                    <StatCard
                        label="Digital Gap"
                        value={`${intel?.digitalGapScore || 0}%`}
                        icon={Shield} color="bg-orange-50 text-orange-600"
                    />
                    <StatCard
                        label="Market Demand"
                        value={`${intel?.demandScore || 0}%`}
                        icon={BarChart3} color="bg-emerald-50 text-emerald-600"
                    />
                    <StatCard
                        label="Revenue Opportunity"
                        value={`$${intel?.revenueEstimate || 0}`}
                        icon={TrendingUp} color="bg-blue-50 text-blue-600"
                    />
                </div>

                {/* Tab Navigation */}
                <div className="px-8 bg-white border-b border-slate-200">
                    <div className="flex gap-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 py-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id
                                        ? "border-indigo-600 text-indigo-600"
                                        : "border-transparent text-slate-400 hover:text-slate-600"
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {!intel ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                            <div className="size-20 bg-slate-100 rounded-[30%] flex items-center justify-center">
                                <Search size={40} className="text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Análisis Pendiente</h3>
                                <p className="text-slate-500 max-w-sm mx-auto">Click en "Analizar" para que nuestra IA diagnostique este lead y genere un reporte estratégico.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === "AUDITORÍA" && (
                                <div className="space-y-8">
                                    <section className="bg-white rounded-3xl p-6 border border-slate-100">
                                        <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                            <Search size={16} /> Auditoría Digital
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h5 className="font-bold text-slate-900 border-b pb-2">Technical Status</h5>
                                                <ul className="space-y-3">
                                                    <li className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-500">Website Status</span>
                                                        {intel.websiteLoads ? <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> ONLINE</span> : <span className="text-red-500 font-bold">OFFLINE</span>}
                                                    </li>
                                                    <li className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-500">SSL Certificate</span>
                                                        {intel.hasSSL ? <span className="text-emerald-600 font-bold">ACTIVE</span> : <span className="text-orange-500 font-bold">MISSING</span>}
                                                    </li>
                                                </ul>
                                            </div>
                                            <div className="space-y-4">
                                                <h5 className="font-bold text-slate-900 border-b pb-2">Detected Problems</h5>
                                                {intel.topProblem && (
                                                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-3">
                                                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                                                        <p className="text-xs text-amber-900 font-bold leading-relaxed">{intel.topProblem}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                    <IntelligenceMarkdown content={intel.strategicBrief || "No hay brief estratégico disponible."} />
                                </div>
                            )}

                            {activeTab === "ESTRATEGIA" && (
                                <div className="space-y-8">
                                    <IntelligenceMarkdown content={intel.strategicBrief || "Procesando estrategia..."} />
                                    <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-20"><Target size={120} /></div>
                                        <h4 className="text-xl font-black mb-4">Strategic Insight</h4>
                                        <p className="text-indigo-100 leading-relaxed max-w-2xl">{intel.strategicBrief?.split('.')[0] || "Generando perspectiva de negocio..."}. Nuestro objetivo es capitalizar el gap digital para aumentar su ROI.</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === "MERCADO" && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white rounded-3xl p-6 border border-slate-100">
                                            <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4">Market Analysis</h4>
                                            <IntelligenceMarkdown content={intel.marketAnalysis || "Cargando análisis local..."} />
                                        </div>
                                        <div className="bg-white rounded-3xl p-6 border border-slate-100">
                                            <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4">Trends & Niche</h4>
                                            <IntelligenceMarkdown content={intel.nicheAnalysis || "Evaluando nicho..."} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "VENTAS" && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
                                            <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center justify-between">
                                                <span>WhatsApp Outreach</span>
                                                <Phone size={14} />
                                            </h4>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group">
                                                <p className="text-sm text-slate-700 italic">{intel.whatsappMsg || "No generado"}</p>
                                                <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-[10px] font-black uppercase text-indigo-600 transition-all">Copiar</button>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
                                            <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center justify-between">
                                                <span>Email Campaign</span>
                                                <Mail size={14} />
                                            </h4>
                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-slate-900 p-2 bg-slate-50 rounded-lg">Asunto: {intel.emailSubject}</div>
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm italic">{intel.emailBody}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
                                        <h4 className="text-sm font-black uppercase text-amber-600 tracking-widest mb-4 flex items-center gap-2">
                                            <BookOpen size={16} /> Discovery Guide
                                        </h4>
                                        <IntelligenceMarkdown content={intel.interviewGuide || "Generando preguntas de clousure..."} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="bg-white px-8 py-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Shield size={12} className="text-indigo-600" />
                        AI-CONSULTANT V2.1 • AGENCIA WEB B2B
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                        Último análisis: {intel?.analyzedAt ? new Date(intel.analyzedAt).toLocaleString() : 'Nunca'}
                    </div>
                </div>
            </div>
        </div>
    );
}
