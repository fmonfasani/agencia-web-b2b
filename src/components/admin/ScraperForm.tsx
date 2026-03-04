"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    MapPin,
    Search,
    Play,
    Loader2,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Users,
    TrendingUp,
    Clock,
    Zap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ScrapeJob {
    job_id: string;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    leads_found: number;
    leads_ingested: number;
    message: string;
    errors?: string[];
}

// ─── Presets de búsqueda comunes para agencias ────────────────────────────────
const QUERY_PRESETS = [
    { label: "Dentistas", query: "dentistas" },
    { label: "Inmobiliarias", query: "inmobiliarias" },
    { label: "Restaurants", query: "restaurantes" },
    { label: "Gyms", query: "gimnasios" },
    { label: "Peluquerías", query: "peluquerías" },
    { label: "Abogados", query: "estudios de abogados" },
    { label: "Contadores", query: "contadores públicos" },
    { label: "Clínicas", query: "clínicas médicas" },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function ScraperForm({
    locale,
    tenantId,
    agentServiceUrl,
    adminSecret,
}: {
    locale: string;
    tenantId: string;
    agentServiceUrl: string;
    adminSecret: string;
}) {
    const [query, setQuery] = useState("");
    const [location, setLocation] = useState("Buenos Aires, Argentina");
    const [maxLeads, setMaxLeads] = useState(25);
    const [loading, setLoading] = useState(false);
    const [job, setJob] = useState<ScrapeJob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // ── Polling: una vez iniciado el job, consulta cada 5s hasta que termine ──
    useEffect(() => {
        if (job && (job.status === "RUNNING" || job.status === "PENDING")) {
            pollingRef.current = setInterval(async () => {
                try {
                    const res = await fetch(
                        `${agentServiceUrl}/scraper/status/${job.job_id}`,
                        { headers: { "X-Admin-Secret": adminSecret } }
                    );
                    if (res.ok) {
                        const updated: ScrapeJob = await res.json();
                        setJob(updated);
                        if (updated.status === "COMPLETED" || updated.status === "FAILED") {
                            clearInterval(pollingRef.current!);
                        }
                    }
                } catch {
                    // Ignorar errores de polling silenciosamente
                }
            }, 5000);
        }
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [job?.job_id, job?.status]);

    // ── Lanzar el scraper ────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) {
            setError("Ingresá qué tipo de negocio querés buscar.");
            return;
        }
        setError(null);
        setLoading(true);
        setJob(null);

        try {
            const res = await fetch(`${agentServiceUrl}/scraper/run`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Admin-Secret": adminSecret,
                },
                body: JSON.stringify({
                    query: query.trim(),
                    location: location.trim(),
                    max_leads: maxLeads,
                    tenant_id: tenantId,
                    language: "es",
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || data.error || "Error al lanzar el scraper.");
            }

            setJob({
                job_id: data.job_id,
                status: "RUNNING",
                leads_found: 0,
                leads_ingested: 0,
                message: data.message,
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetJob = () => {
        setJob(null);
        setError(null);
    };

    // ── Render: Estado del job ───────────────────────────────────────────────
    const renderJobStatus = () => {
        if (!job) return null;

        const isRunning = job.status === "RUNNING" || job.status === "PENDING";
        const isCompleted = job.status === "COMPLETED";
        const isFailed = job.status === "FAILED";

        return (
            <div
                className={`rounded-3xl border-2 p-6 space-y-4 transition-all ${isRunning
                        ? "border-blue-200 bg-blue-50"
                        : isCompleted
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-rose-200 bg-rose-50"
                    }`}
            >
                {/* Header del estado */}
                <div className="flex items-center gap-3">
                    {isRunning && (
                        <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Loader2 className="animate-spin text-blue-600" size={20} />
                        </div>
                    )}
                    {isCompleted && (
                        <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="text-emerald-600" size={20} />
                        </div>
                    )}
                    {isFailed && (
                        <div className="size-10 rounded-full bg-rose-100 flex items-center justify-center">
                            <AlertCircle className="text-rose-600" size={20} />
                        </div>
                    )}
                    <div>
                        <p className={`font-black text-sm ${isRunning ? "text-blue-700" : isCompleted ? "text-emerald-700" : "text-rose-700"
                            }`}>
                            {isRunning ? "Scraping en progreso..." : isCompleted ? "¡Completado!" : "Error en el scraping"}
                        </p>
                        <p className={`text-xs ${isRunning ? "text-blue-500" : isCompleted ? "text-emerald-500" : "text-rose-500"
                            }`}>
                            {job.message}
                        </p>
                    </div>
                </div>

                {/* Métricas */}
                {(isRunning || isCompleted) && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                            <p className="text-2xl font-black text-slate-900">{job.leads_found}</p>
                            <p className="text-xs text-slate-400 font-medium">Negocios encontrados</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                            <p className="text-2xl font-black text-emerald-600">{job.leads_ingested}</p>
                            <p className="text-xs text-slate-400 font-medium">Leads al CRM</p>
                        </div>
                    </div>
                )}

                {/* Barra de progreso */}
                {isRunning && (
                    <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/4 transition-all" />
                    </div>
                )}

                {/* Errores */}
                {job.errors && job.errors.length > 0 && (
                    <p className="text-xs text-rose-500">
                        {job.errors.length} error(es) al ingestar algunos leads.
                    </p>
                )}

                {/* Acciones post-job */}
                {(isCompleted || isFailed) && (
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={resetJob}
                            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all"
                        >
                            <RefreshCw size={14} />
                            Nueva búsqueda
                        </button>
                        {isCompleted && (
                            <a
                                href={`/${locale}/admin/dashboard`}
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-all"
                            >
                                <Users size={14} />
                                Ver leads en el CRM
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { icon: <Zap size={16} />, label: "Motor", value: "Apify + Google Maps", color: "text-amber-600 bg-amber-50" },
                    { icon: <Clock size={16} />, label: "Tiempo estimado", value: `~${Math.ceil(maxLeads * 2 / 60)} min`, color: "text-blue-600 bg-blue-50" },
                    { icon: <TrendingUp size={16} />, label: "Datos extraídos", value: "Nombre · Tel · Web · Rating", color: "text-emerald-600 bg-emerald-50" },
                ].map((card) => (
                    <div key={card.label} className="bg-slate-50 rounded-2xl p-4 space-y-1">
                        <div className={`size-7 rounded-xl ${card.color} flex items-center justify-center`}>
                            {card.icon}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
                        <p className="text-xs font-black text-slate-900">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Formulario principal */}
            {!job && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-medium flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Presets de búsqueda */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                            Búsquedas rápidas
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {QUERY_PRESETS.map((preset) => (
                                <button
                                    key={preset.query}
                                    type="button"
                                    onClick={() => setQuery(preset.query)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${query === preset.query
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Qué buscar */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                            ¿Qué tipo de negocio buscar?
                        </label>
                        <div className="relative group">
                            <Search
                                className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-slate-700 transition-colors"
                                size={18}
                            />
                            <input
                                type="text"
                                placeholder="Ej: dentistas, inmobiliarias, gyms..."
                                className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-slate-900/20 transition-all outline-none font-medium"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Dónde buscar */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                            Ubicación
                        </label>
                        <div className="relative group">
                            <MapPin
                                className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors"
                                size={18}
                            />
                            <input
                                type="text"
                                placeholder="Ej: Buenos Aires, Argentina"
                                className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Cantidad de leads */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                                Cantidad de leads
                            </label>
                            <span className="text-sm font-black text-slate-900">{maxLeads} negocios</span>
                        </div>
                        <input
                            type="range"
                            min={5}
                            max={100}
                            step={5}
                            value={maxLeads}
                            onChange={(e) => setMaxLeads(Number(e.target.value))}
                            className="w-full accent-slate-900 h-2 rounded-full"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>5 (rápido)</span>
                            <span>100 (completo)</span>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-4 rounded-3xl font-black text-sm hover:bg-slate-700 transition-all shadow-2xl shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <Play size={18} />
                                Lanzar Scraper de Google Maps
                            </>
                        )}
                    </button>

                    <p className="text-center text-[10px] text-slate-400 leading-relaxed">
                        Los datos se extraen de Google Maps Business (datos públicos) y se ingresan
                        automáticamente al CRM. Powered by{" "}
                        <a href="https://apify.com" target="_blank" rel="noopener noreferrer" className="underline">
                            Apify
                        </a>
                        .
                    </p>
                </form>
            )}

            {/* Estado del job */}
            {renderJobStatus()}
        </div>
    );
}
