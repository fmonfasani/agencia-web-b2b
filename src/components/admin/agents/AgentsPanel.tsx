"use client";

import { useEffect, useState } from "react";
import {
    Bot,
    Plus,
    Settings,
    Activity,
    MessageSquare,
    Globe,
    Phone,
    Mail,
    ToggleLeft,
    ToggleRight,
    MoreVertical,
    Zap
} from "lucide-react";
import AgentConfigModal from "./AgentConfigModal";

interface Agent {
    id: string;
    name: string;
    type: "INFORMATIVO" | "COMERCIAL" | "SOPORTE";
    channel: "WHATSAPP" | "WEB" | "EMAIL";
    assistantId?: string;
    isActive: boolean;
}

export default function AgentsPanel({ locale }: { locale: string }) {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

    const fetchAgents = async () => {
        try {
            const res = await fetch(`/${locale}/api/admin/agents`);
            const data = await res.json();
            if (Array.isArray(data)) setAgents(data);
        } catch (err) {
            console.error("Fetch agents error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const toggleAgent = async (id: string, current: boolean) => {
        try {
            await fetch(`/${locale}/api/admin/agents/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ isActive: !current }),
            });
            fetchAgents();
        } catch (err) {
            console.error("Toggle error:", err);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
    );

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Bot className="text-indigo-600" size={32} />
                        AI Factory
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Configura y despliega tus asistentes inteligentes.</p>
                </div>
                <button
                    onClick={() => { setEditingAgent(null); setModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    Nuevo Agente
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                    <div key={agent.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <button
                                onClick={() => { setEditingAgent(agent); setModalOpen(true); }}
                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Configurar"
                            >
                                <Settings size={20} />
                            </button>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className={`size-14 rounded-2xl flex items-center justify-center shadow-inner ring-1 ring-inset ${agent.isActive ? 'bg-indigo-50 ring-indigo-100 text-indigo-600' : 'bg-slate-50 ring-slate-100 text-slate-400'}`}>
                                <Bot size={28} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-900 leading-none">{agent.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                        {agent.type}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        {agent.channel === 'WEB' && <Globe size={10} />}
                                        {agent.channel === 'WHATSAPP' && <MessageSquare size={10} />}
                                        {agent.channel === 'EMAIL' && <Mail size={10} />}
                                        {agent.channel}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-50">
                            <div className="flex items-center gap-4 text-slate-400">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-slate-300">Actividad</span>
                                    <span className="text-xs font-bold text-slate-900">Alta</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${agent.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {agent.isActive ? 'ONLINE' : 'PAUSED'}
                                </span>
                                <button onClick={() => toggleAgent(agent.id, agent.isActive)}>
                                    {agent.isActive ? (
                                        <ToggleRight className="text-indigo-600" size={28} />
                                    ) : (
                                        <ToggleLeft className="text-slate-300" size={28} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* OpenAI Badge */}
                        <div className="mt-4 flex items-center gap-1.5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-help">
                            <Zap size={12} className="text-amber-500 fill-amber-500" />
                            <span className="text-[10px] font-bold text-slate-500">Connected to Assistant API</span>
                        </div>
                    </div>
                ))}

                {agents.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="size-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                            <Bot className="text-slate-300" size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">No hay agentes configurados</h3>
                            <p className="text-sm text-slate-500 max-w-xs">Comienza creando tu primer asistente inteligente para automatizar tus ventas.</p>
                        </div>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
                        >
                            Crear Agente
                        </button>
                    </div>
                )}
            </div>

            {modalOpen && (
                <AgentConfigModal
                    locale={locale}
                    agent={editingAgent}
                    onClose={() => setModalOpen(false)}
                    onSuccess={() => { fetchAgents(); setModalOpen(false); }}
                />
            )}
        </div>
    );
}
