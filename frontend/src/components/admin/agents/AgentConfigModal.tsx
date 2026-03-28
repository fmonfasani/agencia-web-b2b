"use client";

import { useState, useEffect } from "react";
import { X, Bot, Sparkles, Save, Shield, HelpCircle, Database } from "lucide-react";

interface AgentConfigModalProps {
    locale: string;
    agent?: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AgentConfigModal({ locale, agent, onClose, onSuccess }: AgentConfigModalProps) {
    const [name, setName] = useState(agent?.name || "");
    const [type, setType] = useState(agent?.type || "COMERCIAL");
    const [channel, setChannel] = useState(agent?.channel || "WEB");
    const [promptConfig, setPromptConfig] = useState(agent?.promptConfig || "");
    const [assistantId, setAssistantId] = useState(agent?.assistantId || "");
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    const isEditing = !!agent;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = isEditing
                ? `/${locale}/api/admin/agents/${agent.id}`
                : `/${locale}/api/admin/agents`;

            const method = isEditing ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, type, channel, promptConfig, assistantId }),
            });

            if (res.ok) {
                onSuccess();
            }
        } catch (err) {
            console.error("Submit agent error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Content */}
            <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-white/50 ring-1 ring-slate-950/10 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                {isEditing ? "Configurar Agente" : "Crear Agente IA"}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 flex items-center gap-1.5">
                                <Shield size={12} className="text-indigo-500" />
                                Módulo AI-Factory v2.0
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-8 pt-6 gap-6 border-b border-slate-50">
                    {['general', 'prompt', 'knowledge'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 px-1 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 space-y-8">

                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nombre del Agente</label>
                                        <input
                                            type="text" value={name} onChange={(e) => setName(e.target.value)} required
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                                            placeholder="Ej: Clara - Sales Expert"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">OpenAI Assistant ID</label>
                                        <input
                                            type="text" value={assistantId} onChange={(e) => setAssistantId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                                            placeholder="asst_..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Especialidad</label>
                                        <select
                                            value={type} onChange={(e) => setType(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 appearance-none cursor-pointer"
                                        >
                                            <option value="COMERCIAL">Comercial / Ventas</option>
                                            <option value="INFORMATIVO">Informativo</option>
                                            <option value="SOPORTE">Soporte Técnico</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Canal Principal</label>
                                        <select
                                            value={channel} onChange={(e) => setChannel(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 appearance-none cursor-pointer"
                                        >
                                            <option value="WEB">Web Widget</option>
                                            <option value="WHATSAPP">WhatsApp Business</option>
                                            <option value="EMAIL">Email Marketing</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'prompt' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Instrucciones de Personalidad</label>
                                    <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100 transition-all">
                                        <Sparkles size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-tight">Mejorar con IA</span>
                                    </div>
                                </div>
                                <textarea
                                    value={promptConfig} onChange={(e) => setPromptConfig(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-[32px] px-6 py-5 text-sm font-medium leading-relaxed outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all min-h-[300px] resize-none"
                                    placeholder="Define cómo debe comportarse tu agente, su tono de voz, restricciones y objetivos..."
                                />
                            </div>
                        )}

                        {activeTab === 'knowledge' && (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="size-20 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100 shadow-inner">
                                    <Database className="text-slate-300" size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-slate-900">Knowledge Base</h3>
                                    <p className="text-sm text-slate-500 max-w-sm">La funcionalidad de carga de documentos (PDF, Docx) y entrenamiento RAG estará disponible próximamente en el plan Enterprise.</p>
                                </div>
                                <button type="button" className="text-indigo-600 font-bold text-sm hover:underline">Solicitar Early Access →</button>
                            </div>
                        )}

                    </div>

                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-all cursor-help">
                            <HelpCircle size={16} />
                            <span className="text-xs font-bold italic">¿Cómo configurar el Assistant ID?</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                type="button" onClick={onClose}
                                className="px-6 py-3 rounded-2xl text-sm font-black text-slate-400 hover:text-slate-600 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit" disabled={loading}
                                className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? "Procesando..." : (
                                    <>
                                        <Save size={18} />
                                        {isEditing ? 'Guardar Cambios' : 'Activar Agente'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
