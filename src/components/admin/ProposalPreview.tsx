"use client";

import React, { useState } from "react";
import {
    X, Send, Download, FileText, CheckCircle2,
    AlertCircle, ChevronLeft, Calendar, DollarSign,
    Target, Rocket, RefreshCw
} from "lucide-react";
import { IntelligenceMarkdown } from "./IntelligenceMarkdown";

interface ProposalPreviewProps {
    proposal: {
        id: string;
        title: string;
        problem: string;
        solution: string;
        deliverables: string[];
        timeline: string;
        investment: string;
        roi: string | null;
        content: string;
    };
    onClose: () => void;
    onSent: () => void;
}

export function ProposalPreview({ proposal, onClose, onSent }: ProposalPreviewProps) {
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSend = async () => {
        setIsSending(true);
        setError(null);
        try {
            const res = await fetch(`/api/proposals/${proposal.id}/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-tenant-id": (proposal as any).tenantId
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al enviar la propuesta");
            }

            onSent();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Top Navigation */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
                >
                    <ChevronLeft size={20} />
                    Volver a Ventas
                </button>

                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                        <Download size={20} />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                    >
                        {isSending ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                        {isSending ? "ENVIANDO..." : "ENVIAR AL CLIENTE"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Proposal Canvas */}
            <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                {/* Executive Header */}
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-start justify-between mb-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">BORRADOR DE PROPUESTA</span>
                            <h1 className="text-3xl font-black text-slate-900 mt-2">{proposal.title}</h1>
                        </div>
                        <div className="size-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
                            <FileText size={32} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Plazo</p>
                                <p className="text-sm font-bold text-slate-900">{proposal.timeline}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Inversión</p>
                                <p className="text-sm font-bold text-slate-900">{proposal.investment}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Target size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Promesa de Valor</p>
                                <p className="text-sm font-bold text-slate-100 mb-0.5 line-clamp-1">{proposal.roi || "Optimización de procesos"}</p>
                                <p className="text-sm font-bold text-slate-900">{proposal.roi || "ROI de impacto inmediato"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100">
                        <h4 className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest mb-4">
                            <AlertCircle size={14} className="text-red-500" /> El Problema
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">{proposal.problem}</p>
                    </div>
                    <div className="bg-white rounded-3xl p-6 border border-slate-100">
                        <h4 className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest mb-4">
                            <Rocket size={14} className="text-emerald-500" /> La Solución
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">{proposal.solution}</p>
                    </div>
                </div>

                {/* Deliverables Section */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
                    <h4 className="text-xl font-black mb-6">Qué incluye esta propuesta</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {proposal.deliverables.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
                                <CheckCircle2 size={20} className="text-indigo-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-indigo-100 font-medium">{item}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detailed Content (Markdown) */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest px-4">Propuesta Detallada</h4>
                    <IntelligenceMarkdown content={proposal.content} />
                </div>
            </div>
        </div>
    );
}
