"use client";

import { useState, useMemo } from "react";
import {
    MapPin, Phone, Globe, Star, ChevronDown, ChevronUp,
    ExternalLink, Search, Filter, Download
} from "lucide-react";

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
    status: string;
    potentialScore: number;
    sourceType: string;
    createdAt: string;
    rawMetadata?: any;
}

type Tab = "overview" | "contact" | "location" | "rating" | "all";

const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "contact", label: "Contacto" },
    { id: "location", label: "Ubicación" },
    { id: "rating", label: "Rating" },
    { id: "all", label: "Todos los campos" },
];

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

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        NEW: "bg-blue-100 text-blue-700",
        CONTACTED: "bg-yellow-100 text-yellow-700",
        QUALIFIED: "bg-green-100 text-green-700",
        WON: "bg-emerald-100 text-emerald-700",
        LOST: "bg-red-100 text-red-700",
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-slate-100 text-slate-600"}`}>
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

export default function LeadsDataTable({ leads }: { leads: Lead[] }) {
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [search, setSearch] = useState("");
    const [sortField, setSortField] = useState<"name" | "rating" | "reviewsCount" | "potentialScore">("potentialScore");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 50;

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
                        <tr>
                            <Th className="w-8">#</Th>
                            <Th field="name">Nombre</Th>

                            {activeTab === "overview" && (
                                <>
                                    <Th>Categoría</Th>
                                    <Th>Teléfono</Th>
                                    <Th>Website</Th>
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
                                <tr key={lead.id} className={`${rowClass} hover:bg-blue-50/30 transition-colors`}>
                                    <Cell className="text-slate-400 tabular-nums w-8">
                                        {(page - 1) * PAGE_SIZE + idx + 1}
                                    </Cell>
                                    <Cell className="font-medium text-slate-900 min-w-[180px]">
                                        <div className="flex flex-col gap-0.5">
                                            <span>{lead.name}</span>
                                            {lead.description && (
                                                <span className="text-xs text-slate-400 font-normal">{lead.description}</span>
                                            )}
                                        </div>
                                    </Cell>

                                    {activeTab === "overview" && (
                                        <>
                                            <Cell>
                                                <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-600">
                                                    {lead.description || "—"}
                                                </span>
                                            </Cell>
                                            <Cell>
                                                {lead.phone ? (
                                                    <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                                                        <Phone className="w-3 h-3" /> {lead.phone}
                                                    </a>
                                                ) : <span className="text-slate-300">—</span>}
                                            </Cell>
                                            <Cell className="max-w-[200px]">
                                                {lead.website ? (
                                                    <a href={lead.website} target="_blank" rel="noreferrer"
                                                        className="text-blue-600 hover:underline flex items-center gap-1 truncate">
                                                        <Globe className="w-3 h-3 shrink-0" />
                                                        <TruncateText text={lead.website.replace(/^https?:\/\//, "")} maxLength={30} />
                                                    </a>
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
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${lead.potentialScore}%` }} />
                                                    </div>
                                                    <span className="text-xs text-slate-500">{lead.potentialScore}</span>
                                                </div>
                                            </Cell>
                                        </>
                                    )}

                                    {activeTab === "contact" && (
                                        <>
                                            <Cell>
                                                {lead.phone ? (
                                                    <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                                                        {lead.phone}
                                                    </a>
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
        </div>
    );
}
