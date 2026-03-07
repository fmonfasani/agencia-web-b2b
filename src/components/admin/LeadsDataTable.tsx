"use client";

import { useState, useMemo } from "react";
import {
    ExternalLink, Search, Download, Zap, AlertCircle,
    CheckCircle2, XCircle, Clock, MessageSquare, Mail,
    ChevronRight, Info, MapPin, Phone, Globe, ChevronDown, ChevronUp,
    Square, CheckSquare, Layers
} from "lucide-react";
import OutreachEnrollmentModal from "./OutreachEnrollmentModal";

// Social media icons (SVG inline)
const IgIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#E1306C]"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>;
const FbIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#1877F2]"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
const TtIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-black"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>;
const TwIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-black"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
const LiIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#0A66C2]"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>;
const WaIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>;

interface Lead {
    id: string;
    name: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    description?: string | null;
    category?: string | null;
    rating?: number | null;
    reviewsCount?: number | null;
    googleMapsUrl?: string | null;
    googlePlaceId?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    whatsapp?: string | null;
    linkedin?: string | null;
    tiktok?: string | null;
    email?: string | null;
    status: string;
    potentialScore: number;
    sourceType: string;
    createdAt: string;
    rawMetadata?: any;
    intelligence?: {
        id?: string;
        updatedAt?: string | Date;
        leadId?: string;
        analyzedAt?: string | Date;
        tier: string;
        opportunityScore: number;
        demandScore: number;
        digitalGapScore: number;
        outreachScore: number;
        websiteLoads?: boolean | null;
        hasSSL?: boolean | null;
        hasContactForm?: boolean | null;
        hasBookingSystem?: boolean | null;
        hasChatbot?: boolean | null;
        hasWhatsappLink?: boolean | null;
        responseTimeMs?: number | null;
        detectedProblems: any;
        topProblem?: string | null;
        bestChannel?: string | null;
        whatsappMsg?: string | null;
        emailSubject?: string | null;
        emailBody?: string | null;
    } | null;
}

type Tab = "overview" | "contact" | "social" | "location" | "rating" | "all";

const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "contact", label: "Contacto" },
    { id: "social", label: "🌐 Redes Sociales" },
    { id: "location", label: "Ubicación" },
    { id: "rating", label: "Rating" },
    { id: "all", label: "Todos los campos" },
];

// Detecta red social desde la URL del website
function detectSocial(url?: string | null) {
    if (!url) return null;
    const u = url.toLowerCase();
    if (u.includes("instagram.com") || u.includes("ig.me")) return { type: "instagram", url };
    if (u.includes("facebook.com") || u.includes("fb.com") || u.includes("fb.me")) return { type: "facebook", url };
    if (u.includes("tiktok.com")) return { type: "tiktok", url };
    if (u.includes("twitter.com") || u.includes("x.com")) return { type: "twitter", url };
    if (u.includes("linkedin.com")) return { type: "linkedin", url };
    if (u.includes("wa.me") || u.includes("whatsapp.com")) return { type: "whatsapp", url };
    return null;
}

function SocialLink({ url, type, label }: { url?: string | null; type: string; label: string }) {
    const icons: Record<string, React.ReactNode> = {
        instagram: <IgIcon />, facebook: <FbIcon />, tiktok: <TtIcon />,
        twitter: <TwIcon />, linkedin: <LiIcon />, whatsapp: <WaIcon />,
    };
    if (!url) return <span className="text-slate-300">—</span>;
    return (
        <a href={url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-slate-700 hover:underline max-w-[180px] truncate">
            {icons[type] || <Globe className="w-4 h-4" />}
            <span className="text-xs truncate">{url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</span>
        </a>
    );
}

function StarRating({ score }: { score: number }) {
    return (
        <div className="flex items-center gap-1">
            <span className="text-amber-500 font-semibold text-sm">{score.toFixed(1)}</span>
            <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className={`w-3 h-3 ${s <= Math.round(score) ? "text-amber-400" : "text-slate-200"}`}
                        fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        </div>
    );
}

function TierBadge({ tier }: { tier?: string }) {
    if (!tier) return <span className="text-slate-300">—</span>;

    const configs: Record<string, { label: string, color: string, icon: string }> = {
        HOT: { label: "HOT", color: "bg-red-100 text-red-700 border-red-200", icon: "🔥" },
        WARM: { label: "WARM", color: "bg-orange-100 text-orange-700 border-orange-200", icon: "🟡" },
        COOL: { label: "COOL", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "🔵" },
        COLD: { label: "COLD", color: "bg-slate-100 text-slate-600 border-slate-200", icon: "❄️" },
    };

    const config = configs[tier] || configs.COLD;

    return (
        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.color}`}>
            <span>{config.icon}</span>
            {config.label}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        NEW: "bg-blue-50 text-blue-600 border-blue-100",
        CONTACTED: "bg-amber-50 text-amber-600 border-amber-100",
        QUALIFIED: "bg-emerald-50 text-emerald-600 border-emerald-100",
        WON: "bg-blue-600 text-white border-blue-700",
        LOST: "bg-slate-100 text-slate-500 border-slate-200",
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors[status] || "bg-slate-50 text-slate-500 border-slate-100"}`}>
            {status}
        </span>
    );
}

function Cell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <td className={`px-3 py-3 text-sm text-slate-700 border-b border-slate-100 ${className}`}>{children}</td>;
}

function TruncateText({ text, maxLength = 40 }: { text?: string | null; maxLength?: number }) {
    if (!text) return <span className="text-slate-300">—</span>;
    if (text.length <= maxLength) return <span>{text}</span>;
    return (
        <span title={text} className="cursor-help">
            {text.substring(0, maxLength)}…
        </span>
    );
}

export default function LeadsDataTable({ leads, tenantId, locale }: { leads: Lead[], tenantId?: string, locale?: string }) {
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [search, setSearch] = useState("");
    const [sortField, setSortField] = useState<any>("potentialScore");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const PAGE_SIZE = 50;

    function toggleLeadSelection(id: string) {
        setSelectedLeadIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }

    function toggleAllOnPage() {
        const pageIds = paginated.map(l => l.id);
        const allSelected = pageIds.every(id => selectedLeadIds.includes(id));
        if (allSelected) {
            setSelectedLeadIds(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedLeadIds(prev => [...new Set([...prev, ...pageIds])]);
        }
    }

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return leads
            .filter((l) =>
                l.name?.toLowerCase().includes(q) ||
                l.address?.toLowerCase().includes(q) ||
                l.description?.toLowerCase().includes(q) ||
                l.phone?.toLowerCase().includes(q)
            )
            .sort((a, b) => {
                const va = (a as any)[sortField] ?? 0;
                const vb = (b as any)[sortField] ?? 0;
                if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
                return sortDir === "asc" ? va - vb : vb - va;
            });
    }, [leads, search, sortField, sortDir]);

    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

    async function handleAnalyze(leadId: string) {
        setIsAnalyzing(true);
        try {
            const res = await fetch(`/api/leads/${leadId}/intelligence`, {
                method: "POST",
            });
            if (!res.ok) throw new Error("Analysis failed");
            const data = await res.json();

            // Update local state
            setSelectedLead(prev => prev ? { ...prev, intelligence: data.data } : null);
            // Optionally refresh the whole page or list here if needed
        } catch (error) {
            console.error(error);
            alert("Error al analizar el lead con IA");
        } finally {
            setIsAnalyzing(false);
        }
    }

    function toggleSort(field: typeof sortField) {
        if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortField(field); setSortDir("desc"); }
    }

    function SortIcon({ field }: { field: typeof sortField }) {
        if (sortField !== field) return <ChevronDown className="w-3 h-3 text-slate-300" />;
        return sortDir === "asc"
            ? <ChevronUp className="w-3 h-3 text-blue-500" />
            : <ChevronDown className="w-3 h-3 text-blue-500" />;
    }

    function Th({ children, field, className = "" }: { children: React.ReactNode; field?: typeof sortField; className?: string }) {
        return (
            <th
                onClick={field ? () => toggleSort(field) : undefined}
                className={`px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 whitespace-nowrap ${field ? "cursor-pointer hover:bg-slate-100 select-none" : ""} ${className}`}
            >
                <div className="flex items-center gap-1">
                    {children}
                    {field && <SortIcon field={field} />}
                </div>
            </th>
        );
    }

    function getRaw(lead: Lead, key: string) {
        const raw = lead.rawMetadata;
        if (!raw) return null;
        return raw[key] ?? null;
    }

    function exportCSV() {
        const headers = ["#", "Nombre", "Teléfono", "Website", "Dirección", "Categoría", "Rating", "Reviews", "Status"];
        const rows = filtered.map((l, i) => [
            i + 1, l.name, l.phone || "", l.website || "", l.address || "",
            l.description || "", l.rating || "", l.reviewsCount || "", l.status
        ]);
        const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Buscar por nombre, dirección, teléfono..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                    />
                </div>
                <span className="text-sm text-slate-500 tabular-nums">
                    {filtered.length} leads
                </span>
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    CSV
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                <table className="w-full bg-white text-sm">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 w-10">
                                <button
                                    onClick={toggleAllOnPage}
                                    className="text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    {paginated.every(l => selectedLeadIds.includes(l.id)) && selectedLeadIds.length > 0 ? (
                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Square className="w-5 h-5" />
                                    )}
                                </button>
                            </th>
                            <Th className="w-8">#</Th>
                            <Th field="name">Nombre / Empresa</Th>

                            {activeTab === "overview" && (
                                <>
                                    <Th>Tier</Th>
                                    <Th>Top Problema</Th>
                                    <Th field="rating">Rating</Th>
                                    <Th field="reviewsCount">Reviews</Th>
                                    <Th>Estado</Th>
                                    <Th field="potentialScore">Score</Th>
                                </>
                            )}

                            {activeTab === "contact" && (
                                <>
                                    <Th>Teléfono</Th>
                                    <Th>Tel. sin formato</Th>
                                    <Th>Website</Th>
                                    <Th>Google Maps</Th>
                                </>
                            )}

                            {activeTab === "social" && (
                                <>
                                    <Th>Instagram</Th>
                                    <Th>Facebook</Th>
                                    <Th>WhatsApp</Th>
                                    <Th>TikTok</Th>
                                    <Th>Twitter / X</Th>
                                    <Th>LinkedIn</Th>
                                </>
                            )}

                            {activeTab === "location" && (
                                <>
                                    <Th>Dirección</Th>
                                    <Th>Barrio</Th>
                                    <Th>Calle</Th>
                                    <Th>Ciudad</Th>
                                    <Th>C.P.</Th>
                                    <Th>País</Th>
                                    <Th>Lat</Th>
                                    <Th>Lng</Th>
                                </>
                            )}

                            {activeTab === "rating" && (
                                <>
                                    <Th field="rating">Total Score</Th>
                                    <Th field="reviewsCount">Reviews Count</Th>
                                    <Th>Categoría</Th>
                                </>
                            )}

                            {activeTab === "all" && (
                                <>
                                    <Th>Teléfono</Th>
                                    <Th>Website</Th>
                                    <Th>Dirección</Th>
                                    <Th>Barrio</Th>
                                    <Th field="rating">Rating</Th>
                                    <Th field="reviewsCount">Reviews</Th>
                                    <Th>Lat</Th>
                                    <Th>Lng</Th>
                                    <Th>Estado</Th>
                                    <Th field="potentialScore">Score</Th>
                                    <Th>Fuente</Th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((lead, idx) => {
                            const raw = lead.rawMetadata || {};
                            const rowClass = idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";
                            return (
                                <tr
                                    key={lead.id}
                                    className={`${rowClass} ${selectedLeadIds.includes(lead.id) ? "bg-blue-50/40" : ""} hover:bg-blue-50/30 transition-colors cursor-pointer group`}
                                    onClick={(e) => {
                                        // Prevents row click if clicking checkbox specifically
                                        if ((e.target as any).closest('.selection-checkbox')) return;
                                        setSelectedLead(lead);
                                    }}
                                >
                                    <td className="px-3 py-3 border-b border-slate-100 selection-checkbox">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLeadSelection(lead.id);
                                            }}
                                            className="text-slate-300 hover:text-blue-600 transition-colors"
                                        >
                                            {selectedLeadIds.includes(lead.id) ? (
                                                <CheckSquare className="w-5 h-5 text-blue-600" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </td>
                                    <Cell className="text-slate-400 tabular-nums w-8">
                                        {(page - 1) * PAGE_SIZE + idx + 1}
                                    </Cell>
                                    <Cell className="font-medium text-slate-900 min-w-[180px]">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span>{lead.name}</span>
                                                <ChevronRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            {lead.description && (
                                                <span className="text-xs text-slate-400 font-normal">{lead.description}</span>
                                            )}
                                        </div>
                                    </Cell>

                                    {activeTab === "overview" && (
                                        <>
                                            <Cell><TierBadge tier={lead.intelligence?.tier} /></Cell>
                                            <Cell className="max-w-[150px]">
                                                {lead.intelligence?.topProblem ? (
                                                    <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate block">
                                                        {lead.intelligence.topProblem}
                                                    </span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </Cell>
                                            <Cell>
                                                {lead.rating ? <StarRating score={lead.rating} /> : <span className="text-slate-300">—</span>}
                                            </Cell>
                                            <Cell className="tabular-nums">
                                                {lead.reviewsCount ? lead.reviewsCount.toLocaleString("es-AR") : "—"}
                                            </Cell>
                                            <Cell><StatusBadge status={lead.status} /></Cell>
                                            <Cell>
                                                <div className="flex items-center gap-1">
                                                    <div className={`h-1.5 w-12 rounded-full bg-slate-100 overflow-hidden`}>
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${lead.intelligence?.opportunityScore ?? lead.potentialScore}%` }} />
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-medium">{lead.intelligence?.opportunityScore ?? lead.potentialScore}</span>
                                                </div>
                                            </Cell>
                                        </>
                                    )}

                                    {activeTab === "contact" && (
                                        <>
                                            <Cell>
                                                {lead.phone ? (
                                                    <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">{lead.phone}</a>
                                                ) : <span className="text-slate-300">—</span>}
                                            </Cell>
                                            <Cell className="text-slate-500 font-mono text-xs">
                                                {raw.phoneUnformatted || "—"}
                                            </Cell>
                                            <Cell className="max-w-[220px]">
                                                {lead.website ? (
                                                    <a href={lead.website} target="_blank" rel="noreferrer"
                                                        className="text-blue-600 hover:underline truncate block max-w-full">
                                                        {lead.website.replace(/^https?:\/\//, "")}
                                                    </a>
                                                ) : <span className="text-slate-300">—</span>}
                                            </Cell>
                                            <Cell>
                                                {lead.googleMapsUrl ? (
                                                    <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer"
                                                        className="text-blue-600 hover:underline flex items-center gap-1">
                                                        <ExternalLink className="w-3 h-3" /> Ver en Maps
                                                    </a>
                                                ) : <span className="text-slate-300">—</span>}
                                            </Cell>
                                        </>
                                    )}

                                    {activeTab === "social" && (() => {
                                        // Detect from website if dedicated field is empty
                                        const detected = detectSocial(lead.website);
                                        const ig = lead.instagram || (detected?.type === "instagram" ? detected.url : null) || raw.socialMedia?.find((s: any) => s.type === "instagram")?.url;
                                        const fb = lead.facebook || (detected?.type === "facebook" ? detected.url : null) || raw.socialMedia?.find((s: any) => s.type === "facebook")?.url;
                                        const wa = lead.whatsapp || (detected?.type === "whatsapp" ? detected.url : null);
                                        const tt = lead.tiktok || (detected?.type === "tiktok" ? detected.url : null) || raw.socialMedia?.find((s: any) => s.type === "tiktok")?.url;
                                        const tw = (detected?.type === "twitter" ? detected.url : null) || raw.socialMedia?.find((s: any) => s.type === "twitter")?.url;
                                        const li = lead.linkedin || (detected?.type === "linkedin" ? detected.url : null) || raw.socialMedia?.find((s: any) => s.type === "linkedin")?.url;
                                        return (
                                            <>
                                                <Cell><SocialLink url={ig} type="instagram" label="Instagram" /></Cell>
                                                <Cell><SocialLink url={fb} type="facebook" label="Facebook" /></Cell>
                                                <Cell><SocialLink url={wa} type="whatsapp" label="WhatsApp" /></Cell>
                                                <Cell><SocialLink url={tt} type="tiktok" label="TikTok" /></Cell>
                                                <Cell><SocialLink url={tw} type="twitter" label="Twitter" /></Cell>
                                                <Cell><SocialLink url={li} type="linkedin" label="LinkedIn" /></Cell>
                                            </>
                                        );
                                    })()}

                                    {activeTab === "location" && (
                                        <>
                                            <Cell className="max-w-[180px]"><TruncateText text={raw.address || lead.address} /></Cell>
                                            <Cell><TruncateText text={raw.neighborhood} /></Cell>
                                            <Cell><TruncateText text={raw.street} /></Cell>
                                            <Cell><TruncateText text={raw.city} maxLength={20} /></Cell>
                                            <Cell className="font-mono text-xs">{raw.postalCode || "—"}</Cell>
                                            <Cell>
                                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">
                                                    {raw.countryCode || "—"}
                                                </span>
                                            </Cell>
                                            <Cell className="font-mono text-xs tabular-nums">
                                                {raw.location?.lat?.toFixed(4) ?? "—"}
                                            </Cell>
                                            <Cell className="font-mono text-xs tabular-nums">
                                                {raw.location?.lng?.toFixed(4) ?? "—"}
                                            </Cell>
                                        </>
                                    )}

                                    {activeTab === "rating" && (
                                        <>
                                            <Cell>
                                                {lead.rating ? (
                                                    <div className="flex items-center gap-2">
                                                        <StarRating score={lead.rating} />
                                                    </div>
                                                ) : <span className="text-slate-300">—</span>}
                                            </Cell>
                                            <Cell className="tabular-nums font-medium">
                                                {lead.reviewsCount?.toLocaleString("es-AR") ?? "—"}
                                            </Cell>
                                            <Cell>
                                                <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs">
                                                    {lead.description || raw.categoryName || "—"}
                                                </span>
                                            </Cell>
                                        </>
                                    )}

                                    {activeTab === "all" && (
                                        <>
                                            <Cell>
                                                {lead.phone ? (
                                                    <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">{lead.phone}</a>
                                                ) : <span className="text-slate-300">—</span>}
                                            </Cell>
                                            <Cell className="max-w-[150px]">
                                                {lead.website ? (
                                                    <a href={lead.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block">
                                                        <TruncateText text={lead.website.replace(/^https?:\/\//, "")} maxLength={25} />
                                                    </a>
                                                ) : <span className="text-slate-300">—</span>}
                                            </Cell>
                                            <Cell className="max-w-[160px]"><TruncateText text={raw.address || lead.address} /></Cell>
                                            <Cell><TruncateText text={raw.neighborhood} maxLength={20} /></Cell>
                                            <Cell>{lead.rating ? <StarRating score={lead.rating} /> : "—"}</Cell>
                                            <Cell className="tabular-nums">{lead.reviewsCount?.toLocaleString("es-AR") ?? "—"}</Cell>
                                            <Cell className="font-mono text-xs">{raw.location?.lat?.toFixed(4) ?? "—"}</Cell>
                                            <Cell className="font-mono text-xs">{raw.location?.lng?.toFixed(4) ?? "—"}</Cell>
                                            <Cell><StatusBadge status={lead.status} /></Cell>
                                            <Cell>
                                                <div className="flex items-center gap-1">
                                                    <div className="h-1.5 w-10 rounded-full bg-slate-100 overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${lead.potentialScore}%` }} />
                                                    </div>
                                                    <span className="text-xs">{lead.potentialScore}</span>
                                                </div>
                                            </Cell>
                                            <Cell>
                                                <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-xs font-medium">
                                                    {lead.sourceType}
                                                </span>
                                            </Cell>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                        {paginated.length === 0 && (
                            <tr>
                                <td colSpan={20} className="py-16 text-center text-slate-400">
                                    <MapPin className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                    <p>No hay leads que coincidan con la búsqueda</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                        >
                            ← Anterior
                        </button>
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}
            {/* Multi-Selection Bulk Actions Bar */}
            {selectedLeadIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white px-8 py-4 rounded-[2.5rem] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-md animate-in slide-in-from-bottom-10 duration-500">
                    <div className="flex items-center gap-4 border-r border-white/10 pr-8">
                        <div className="size-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-sm shadow-xl shadow-blue-500/20">
                            {selectedLeadIds.length}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Leads Seleccionados</span>
                            <span className="text-xs font-bold leading-none">Acción Masiva Activa</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsEnrollModalOpen(true)}
                            className="bg-white text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                        >
                            <Layers size={14} /> Inscribir en Outreach
                        </button>
                        <button
                            onClick={() => setSelectedLeadIds([])}
                            className="text-white/40 hover:text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors"
                        >
                            Descartar
                        </button>
                    </div>
                </div>
            )}

            {/* Outreach Enrollment Modal */}
            <OutreachEnrollmentModal
                isOpen={isEnrollModalOpen}
                onClose={() => {
                    setIsEnrollModalOpen(false);
                    setSelectedLeadIds([]);
                }}
                leadIds={selectedLeadIds}
                locale={locale || "es"}
                tenantId={tenantId}
            />

            {/* Intelligence Drawer */}
            {selectedLead && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedLead(null)}
                    />

                    {/* Panel */}
                    <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-slate-900">{selectedLead.name}</h2>
                                    <TierBadge tier={selectedLead.intelligence?.tier} />
                                </div>
                                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {selectedLead.address || "Sin dirección fija"}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedLead(null)}
                                className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Opportunity Score</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-black text-blue-900">{selectedLead.intelligence?.opportunityScore ?? 0}</span>
                                        <span className="text-sm font-medium text-blue-700/60 mb-1">/ 100</span>
                                    </div>
                                    <div className="mt-3 h-1.5 w-full bg-blue-200/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${selectedLead.intelligence?.opportunityScore ?? 0}%` }} />
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mejor Canal</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {selectedLead.intelligence?.bestChannel === "whatsapp" ? (
                                            <>
                                                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                                    <WaIcon />
                                                </div>
                                                <span className="font-bold text-slate-700 uppercase text-xs">WhatsApp</span>
                                            </>
                                        ) : selectedLead.intelligence?.bestChannel === "email" ? (
                                            <>
                                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-slate-700 uppercase text-xs">Email</span>
                                            </>
                                        ) : (
                                            <span className="text-slate-400 font-medium italic">Sin definir</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic">Basado en datos disponibles</p>
                                </div>
                            </div>

                            {/* Detailed Scores */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-3 h-3" />
                                    Digital Analysis Breakdown
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm flex flex-col items-center text-center">
                                        <span className="text-lg font-bold text-slate-800">{selectedLead.intelligence?.demandScore ?? 0}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">Demand</span>
                                    </div>
                                    <div className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm flex flex-col items-center text-center">
                                        <span className="text-lg font-bold text-slate-800">{selectedLead.intelligence?.digitalGapScore ?? 0}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">Digital Gap</span>
                                    </div>
                                    <div className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm flex flex-col items-center text-center">
                                        <span className="text-lg font-bold text-slate-800">{selectedLead.intelligence?.outreachScore ?? 0}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">Outreach</span>
                                    </div>
                                </div>
                            </div>

                            {/* Detected Problems */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3 text-red-400" />
                                    Problemas y Oportunidades
                                </h3>
                                <div className="space-y-3">
                                    {selectedLead.intelligence?.detectedProblems && (selectedLead.intelligence.detectedProblems as any[]).length > 0 ? (
                                        (selectedLead.intelligence.detectedProblems as any[]).map((prob, i) => (
                                            <div key={i} className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 transition-colors group/item shadow-sm">
                                                <div className="shrink-0 w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 font-bold">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-bold text-slate-800 text-sm">{prob.problem}</h4>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prob.urgency >= 4 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                                                            }`}>
                                                            {prob.urgency >= 4 ? "CRÍTICO" : "ALTO VESTA"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">{prob.pain}</p>
                                                    <div className="pt-2 flex items-center gap-2">
                                                        <div className="flex-1 h-px bg-slate-100" />
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Solución Recomendada</span>
                                                        <div className="flex-1 h-px bg-slate-100" />
                                                    </div>
                                                    <p className="text-[11px] font-bold text-blue-700 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                                                        ✨ {prob.service}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-100 mx-auto mb-3" />
                                            <p className="text-sm text-slate-400">No se detectaron brechas digitales críticas</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* AI Generated Message */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3 text-blue-400" />
                                    Outreach Automatizado (IA)
                                </h3>
                                <div className="p-5 rounded-3xl bg-slate-900 text-slate-100 relative overflow-hidden group/box shadow-xl border border-slate-800">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/box:opacity-10 transition-opacity">
                                        <Zap className="w-32 h-32 text-blue-400" />
                                    </div>

                                    <div className="relative space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                <span className="text-[10px] font-bold text-blue-400 uppercase">WhatsApp Personalizado</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(selectedLead.intelligence?.whatsappMsg || "");
                                                    alert("Copiado al portapapeles");
                                                }}
                                                className="text-[10px] font-bold hover:text-blue-400 transition-colors uppercase"
                                            >
                                                Copiar Texto
                                            </button>
                                        </div>

                                        <p className="text-xs leading-relaxed text-slate-300 italic">
                                            {selectedLead.intelligence?.whatsappMsg || "Selecciona un lead con análisis completo para generar el mensaje automático."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                            <button className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-4 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-[0.98]">
                                <MessageSquare className="w-4 h-4" />
                                Abrir WhatsApp
                            </button>
                            <button
                                onClick={() => handleAnalyze(selectedLead.id)}
                                disabled={isAnalyzing}
                                className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 p-3 rounded-2xl hover:bg-slate-100 transition-all font-bold text-sm disabled:opacity-50"
                            >
                                <Zap className={`w-4 h-4 text-amber-500 ${isAnalyzing ? "animate-spin" : ""}`} />
                                {isAnalyzing ? "Analizando..." : "Re-Analizar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
