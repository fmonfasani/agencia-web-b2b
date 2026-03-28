"use client";

import React, { useEffect, useState } from "react";
import {
    Layout,
    MoreHorizontal,
    Plus,
    Search,
    Filter,
    Users,
    Target,
    Calendar,
    FileText,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Zap,
    ChevronRight,
    ArrowRight
} from "lucide-react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import LeadIntelligenceModal from "@/components/admin/LeadIntelligenceModal";

const PIPELINE_STAGES = [
    { id: "NUEVO", label: "Nuevo / Propensión", color: "bg-slate-100 text-slate-600", icon: Users },
    { id: "CALIFICADO", label: "Calificado", color: "bg-amber-50 text-amber-600", icon: Target },
    { id: "ELEGIDO", label: "Elegido", color: "bg-indigo-50 text-indigo-600", icon: Zap },
    { id: "ENTREVISTA", label: "Entrevista", color: "bg-blue-50 text-blue-600", icon: Calendar },
    { id: "PROPUESTA_ENVIADA", label: "Propuesta Enviada", color: "bg-orange-50 text-orange-600", icon: FileText },
    { id: "GANADA", label: "Ganada", color: "bg-emerald-50 text-emerald-600", icon: CheckCircle2 },
];

export default function PipelinePage() {
    const [leadsByStatus, setLeadsByStatus] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const fetchLeads = async () => {
        try {
            const res = await fetch("/api/leads/pipeline"); // Need to make sure this returns grouped leads or similar
            // For now, I'll fetch individual statuses or update the API to return all pipeline leads
            // Let's assume we can fetch all leads in one call or a loop for now (loop is safer if API is not group-ready)
            const stageLeads: Record<string, any[]> = {};

            for (const stage of PIPELINE_STAGES) {
                const r = await fetch(`/api/leads/pipeline/${stage.id}`);
                if (r.ok) {
                    const data = await r.json();
                    stageLeads[stage.id] = data;
                }
            }
            setLeadsByStatus(stageLeads);
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleStageChange = async (leadId: string, newStatus: string) => {
        try {
            const res = await fetch("/api/leads/pipeline", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leadId, status: newStatus })
            });
            if (res.ok) fetchLeads();
        } catch (error) {
            console.error("Error moving lead:", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-8">
            <div className="max-w-[1800px] mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="size-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                                <Layout size={20} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sales Pipeline</h1>
                        </div>
                        <p className="text-slate-500 font-medium ml-1">Gestiona tus prospectos calificados por IA en un flujo visual premium.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar lead..."
                                className="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl w-64 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all shadow-sm"
                            />
                        </div>
                        <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar lg:grid lg:grid-cols-6 lg:overflow-visible min-h-[70vh]">
                    {PIPELINE_STAGES.map((stage) => (
                        <div key={stage.id} className="flex flex-col min-w-[320px] gap-4">
                            {/* Column Header */}
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-xl ${stage.color}`}>
                                        <stage.icon size={16} />
                                    </div>
                                    <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">{stage.label}</h3>
                                    <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                        {leadsByStatus[stage.id]?.length || 0}
                                    </span>
                                </div>
                                <button className="text-slate-400 hover:text-slate-600">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>

                            {/* Column Content */}
                            <div className="flex-1 bg-slate-200/30 rounded-[2.5rem] p-4 border-2 border-dashed border-slate-200/50 space-y-4">
                                {leadsByStatus[stage.id]?.map((lead) => (
                                    <motion.div
                                        key={lead.id}
                                        layoutId={lead.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ y: -4 }}
                                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 cursor-pointer group hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
                                        onClick={() => setSelectedLead(lead)}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="size-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                                    {lead.logoUrl ? (
                                                        <img src={lead.logoUrl} alt="" className="size-full object-cover" />
                                                    ) : (
                                                        <Users size={14} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{lead.name}</h4>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ChevronRight size={16} className="text-indigo-600" />
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{lead.description || "Sin descripción disponible."}</p>

                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex items-center gap-2">
                                                <div className={`size-2 rounded-full ${lead.potentialScore > 80 ? 'bg-emerald-500' : lead.potentialScore > 50 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IA Score: {lead.potentialScore}%</span>
                                            </div>
                                            {lead.websiteUrl && (
                                                <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                                                    <TrendingUp size={10} />
                                                    PROFIT
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}

                                {leadsByStatus[stage.id]?.length === 0 && (
                                    <div className="h-32 flex flex-col items-center justify-center text-slate-400 space-y-2">
                                        <Plus size={24} className="opacity-20" />
                                        <span className="text-[10px] uppercase font-black tracking-widest opacity-40">Vacío</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Selected Lead Modal */}
            <AnimatePresence>
                {selectedLead && (
                    <LeadIntelligenceModal
                        lead={selectedLead}
                        onClose={() => {
                            setSelectedLead(null);
                            fetchLeads(); // Refresh when closed
                        }}
                        isAnalyzing={isAnalyzing}
                        onReAnalyze={async () => {
                            setIsAnalyzing(true);
                            try {
                                await fetch(`/api/leads/score/${selectedLead.id}`, { method: "POST" });
                                // Fetch updated lead info
                                const res = await fetch(`/api/leads/${selectedLead.id}`);
                                const updatedLead = await res.json();
                                setSelectedLead(updatedLead);
                                fetchLeads();
                            } finally {
                                setIsAnalyzing(false);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 20px;
                }
            `}</style>
        </div>
    );
}

