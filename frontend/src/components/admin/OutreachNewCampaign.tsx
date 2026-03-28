"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Send,
    Loader2,
    CheckCircle2,
    Mail,
    MessageCircle,
    Hash,
    FileText,
    Zap,
    ChevronLeft
} from "lucide-react";
import Link from "next/link";

export default function OutreachNewCampaign({ locale, tenantId }: { locale: string; tenantId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        channel: "EMAIL", // Default
        template: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/${locale}/api/outreach/campaigns`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    tenantId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al crear la campaña");
            }

            setSuccess(true);
            setTimeout(() => {
                router.push(`/${locale}/admin/outreach`);
                router.refresh();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="size-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-pulse shadow-xl shadow-emerald-100">
                    <CheckCircle2 size={48} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Campaña Creada</h2>
                    <p className="text-slate-500 font-medium tracking-tight">
                        La estructura de outreach ha sido inicializada exitosamente. <br />
                        Redirigiendo al panel de control...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            <Link
                href={`/${locale}/admin/outreach`}
                className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 hover:text-blue-600 transition-colors group"
            >
                <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Volver al Listado
            </Link>

            <div className="space-y-2 mb-12">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Nueva <span className="text-blue-600">Secuencia</span></h1>
                <p className="text-slate-500 font-medium">Configura el motor de contacto para escalar tu prospección.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                {error && (
                    <div className="p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-rose-100/50">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Main Form Fields */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Campaign Basics */}
                        <section className="space-y-6">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identidad de la Campaña</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                                    <Hash size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nombre de la Campaña (ej. Follow-up Leads Tier A)"
                                    className="w-full bg-white border border-slate-200 rounded-3xl py-5 pl-14 pr-6 text-sm font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </section>

                        {/* Content Template */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cuerpo del Mensaje (Template)</label>
                                <button type="button" className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 hover:underline">
                                    <Zap size={10} fill="currentColor" /> Generar con AI
                                </button>
                            </div>
                            <div className="relative group">
                                <div className="absolute left-5 top-5 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                                    <FileText size={18} />
                                </div>
                                <textarea
                                    required
                                    placeholder="Escribe el mensaje que recibirán tus leads. Puedes usar variables como {name} o {company}."
                                    rows={10}
                                    className="w-full bg-white border border-slate-200 rounded-[2.5rem] p-8 pl-14 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm resize-none"
                                    value={formData.template}
                                    onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                                />
                            </div>
                        </section>
                    </div>

                    {/* Side Configuration */}
                    <div className="space-y-8">
                        {/* Channel Selection */}
                        <section className="space-y-6">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Canal Primario</label>
                            <div className="flex flex-col gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, channel: "EMAIL" })}
                                    className={`p-6 rounded-[2rem] border-2 flex items-center gap-4 transition-all text-left ${formData.channel === "EMAIL"
                                            ? "bg-blue-50 border-blue-600 text-blue-600 shadow-xl shadow-blue-100"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        }`}
                                >
                                    <div className={`p-3 rounded-2xl ${formData.channel === "EMAIL" ? "bg-blue-600 text-white" : "bg-slate-50"}`}>
                                        <Mail size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-widest">Email Marketing</span>
                                        <span className="text-[10px] font-medium opacity-60">Resend API</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, channel: "WHATSAPP" })}
                                    className={`p-6 rounded-[2rem] border-2 flex items-center gap-4 transition-all text-left ${formData.channel === "WHATSAPP"
                                            ? "bg-emerald-50 border-emerald-600 text-emerald-600 shadow-xl shadow-emerald-100"
                                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        }`}
                                >
                                    <div className={`p-3 rounded-2xl ${formData.channel === "WHATSAPP" ? "bg-emerald-600 text-white" : "bg-slate-50"}`}>
                                        <MessageCircle size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-widest">WhatsApp Direct</span>
                                        <span className="text-[10px] font-medium opacity-60">Meta API</span>
                                    </div>
                                </button>
                            </div>
                        </section>

                        <div className="p-6 bg-slate-100 rounded-[2rem] space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                                <AlertCircle size={14} /> Tips de Conversión
                            </div>
                            <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                                Las campañas de WhatsApp tienen un **80% más de tasa de lectura** que las de Email. Asegúrate de incluir un CTA claro.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action CTA */}
                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50 group hover:-translate-y-1"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                Inicializar Secuencia Maestra
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

const AlertCircle = ({ size, className }: { size: number; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);
