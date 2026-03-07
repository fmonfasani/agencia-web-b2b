"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Send,
    Loader2,
    CheckCircle2,
    Target,
    Zap,
    MessageCircle,
    Mail,
    AlertCircle
} from "lucide-react";

interface Campaign {
    id: string;
    name: string;
    channel: string;
    status: string;
}

export default function OutreachEnrollmentModal({
    isOpen,
    onClose,
    leadIds,
    locale,
    tenantId
}: {
    isOpen: boolean;
    onClose: () => void;
    leadIds: string[];
    locale: string;
    tenantId?: string;
}) {
    const [loading, setLoading] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && tenantId) {
            fetch(`/${locale}/api/outreach/campaigns?tenantId=${tenantId}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setCampaigns(data.filter((c: any) => c.status === "DRAFT" || c.status === "ACTIVE"));
                    }
                })
                .catch(err => console.error(err));
        }
    }, [isOpen, tenantId, locale]);

    const handleEnroll = async () => {
        if (!selectedCampaignId) return;
        setLoading(true);
        try {
            const res = await fetch(`/${locale}/api/outreach/campaigns/${selectedCampaignId}/enroll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leadIds }),
            });
            if (!res.ok) throw new Error("Enrollment failed");
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);
        } catch (error) {
            console.error(error);
            alert("Error al inscribir leads");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
                {success ? (
                    <div className="p-12 text-center space-y-4">
                        <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">¡Leads Inscritos!</h2>
                        <p className="text-slate-500 text-sm font-medium">
                            Los {leadIds.length} leads han sido añadidos a la cola de la campaña.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                                    <Target size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="font-black text-slate-900 uppercase text-[10px] tracking-widest leading-none mb-1">Inscripción Outreach</h2>
                                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Secuencia AI Activa</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Seleccionar Campaña Destino</label>
                                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 admin-scroll">
                                    {campaigns.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedCampaignId(c.id)}
                                            className={`p-4 rounded-[1.5rem] border-2 text-left transition-all flex items-center justify-between group ${selectedCampaignId === c.id
                                                    ? "bg-blue-50 border-blue-600 text-blue-700 shadow-xl shadow-blue-100"
                                                    : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${selectedCampaignId === c.id ? "bg-blue-600 text-white" : "bg-slate-50 group-hover:bg-slate-100"}`}>
                                                    {c.channel === "WHATSAPP" ? <MessageCircle size={14} /> : <Mail size={14} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs tracking-tight uppercase">{c.name}</span>
                                                    <span className="text-[9px] font-bold opacity-60 uppercase">{c.channel} CHANNEL</span>
                                                </div>
                                            </div>
                                            {selectedCampaignId === c.id && <Zap size={14} fill="currentColor" />}
                                        </button>
                                    ))}
                                    {campaigns.length === 0 && (
                                        <div className="p-10 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                            <AlertCircle size={24} className="mx-auto text-slate-300 mb-3" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay campañas activas</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-4">
                                <div className="text-blue-600 mt-1"><Zap size={16} fill="currentColor" /></div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-tight">Impacto Estimado</span>
                                    <p className="text-[11px] font-medium text-blue-700/80 leading-relaxed">
                                        Vas a inscribir <span className="font-black underline">{leadIds.length} leads</span>. Se generarán mensajes dinámicos basados en sus puntuaciones de oportunidad.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleEnroll}
                                disabled={loading || !selectedCampaignId}
                                className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50 group"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" /> Confirmar Lanzamiento</>}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
