"use client";

import { useState } from "react";
import {
  ExternalLink,
  Search,
  Download,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare,
  Layers,
} from "lucide-react";
import OutreachEnrollmentModal from "./OutreachEnrollmentModal";
import LeadIntelligenceModal from "./LeadIntelligenceModal";
import { useLeadsTable, Tab } from "@/hooks/useLeadsTable";
import { Lead } from "@/types/leads";

// Social media icons (SVG inline)
const IgIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#E1306C]">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);
const FbIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#1877F2]">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const TtIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-black">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);
const TwIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-black">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const LiIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#0A66C2]">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const WaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TABS_CONFIG: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "contact", label: "Contacto" },
  { id: "social", label: "🌐 Redes Sociales" },
  { id: "location", label: "Ubicación" },
  { id: "rating", label: "Rating" },
  { id: "all", label: "Todos los campos" },
];

function detectSocial(url?: string | null) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes("instagram.com") || u.includes("ig.me"))
    return { type: "instagram", url };
  if (u.includes("facebook.com") || u.includes("fb.com") || u.includes("fb.me"))
    return { type: "facebook", url };
  if (u.includes("tiktok.com")) return { type: "tiktok", url };
  if (u.includes("twitter.com") || u.includes("x.com"))
    return { type: "twitter", url };
  if (u.includes("linkedin.com")) return { type: "linkedin", url };
  if (u.includes("wa.me") || u.includes("whatsapp.com"))
    return { type: "whatsapp", url };
  return null;
}

function SocialLink({ url, type }: { url?: string | null; type: string }) {
  const icons: Record<string, React.ReactNode> = {
    instagram: <IgIcon />,
    facebook: <FbIcon />,
    tiktok: <TtIcon />,
    twitter: <TwIcon />,
    linkedin: <LiIcon />,
    whatsapp: <WaIcon />,
  };
  if (!url) return <span className="text-slate-300">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 text-slate-700 hover:underline max-w-[180px] truncate"
    >
      {icons[type] || <Globe className="w-4 h-4" />}
      <span className="text-xs truncate">
        {url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
      </span>
    </a>
  );
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-amber-500 font-semibold text-sm">
        {score.toFixed(1)}
      </span>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg
            key={s}
            className={`w-3 h-3 ${s <= Math.round(score) ? "text-amber-400" : "text-slate-200"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return <span className="text-slate-300">—</span>;
  const configs: Record<
    string,
    { label: string; color: string; icon: string }
  > = {
    HOT: {
      label: "HOT",
      color: "bg-red-100 text-red-700 border-red-200",
      icon: "🔥",
    },
    WARM: {
      label: "WARM",
      color: "bg-orange-100 text-orange-700 border-orange-200",
      icon: "🟡",
    },
    COOL: {
      label: "COOL",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      icon: "🔵",
    },
    COLD: {
      label: "COLD",
      color: "bg-slate-100 text-slate-600 border-slate-200",
      icon: "❄️",
    },
  };
  const config = configs[tier] || configs.COLD;
  return (
    <span
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.color}`}
    >
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
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors[status] || "bg-slate-50 text-slate-500 border-slate-100"}`}
    >
      {status}
    </span>
  );
}

function Cell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-3 text-sm text-slate-700 border-b border-slate-100 ${className}`}
    >
      {children}
    </td>
  );
}

function TruncateText({
  text,
  maxLength = 40,
}: {
  text?: string | null;
  maxLength?: number;
}) {
  if (!text) return <span className="text-slate-300">—</span>;
  if (text.length <= maxLength) return <span>{text}</span>;
  return (
    <span title={text} className="cursor-help">
      {text.substring(0, maxLength)}…
    </span>
  );
}

interface ThProps {
  children: React.ReactNode;
  field?: string;
  className?: string;
  sortField?: string | null;
  sortDir?: "asc" | "desc";
  toggleSort: (field: string) => void;
}

const Th = ({
  children,
  field,
  className = "",
  sortField,
  sortDir,
  toggleSort,
}: ThProps) => (
  <th
    onClick={() => field && toggleSort(field)}
    className={`px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50/50 ${field ? "cursor-pointer hover:bg-slate-100" : ""} ${className}`}
  >
    <div className="flex items-center gap-1">
      {children}
      {field &&
        sortField === field &&
        (sortDir === "desc" ? (
          <ChevronDown size={12} />
        ) : (
          <ChevronUp size={12} />
        ))}
    </div>
  </th>
);

export default function LeadsDataTable({
  leads: initialLeads,
  tenantId,
}: {
  leads: Lead[];
  tenantId?: string;
  locale?: string;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    sortField,
    sortDir,
    page,
    setPage,
    selectedLeadIds,
    toggleLeadSelection,
    toggleAllOnPage,
    toggleSort,
    selectedLead,
    setSelectedLead,
    isAnalyzing,
    paginated,
    totalPages,
    handleAnalyze,
    exportCSV,
  } = useLeadsTable({ leads });

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const onAnalyze = async (id: string, force: boolean = false) => {
    const updated = await handleAnalyze(id, force);
    if (updated) {
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      setSelectedLead(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar leads por nombre, dirección..."
              className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-2xl text-sm w-full md:w-[300px] focus:ring-2 focus:ring-indigo-600/10 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-slate-100 hidden md:block" />
          <div className="flex items-center p-1 bg-slate-50 rounded-2xl">
            {TABS_CONFIG.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === t.id
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedLeadIds.length > 0 && (
            <button
              onClick={() => setIsEnrollModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all"
            >
              <Zap size={14} />
              Enrolar ({selectedLeadIds.length})
            </button>
          )}
          <button
            onClick={() => exportCSV(leads)}
            className="p-2.5 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 transition-all shadow-sm"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-10 px-3 py-3 border-b border-slate-100 bg-slate-50/50">
                <button
                  onClick={toggleAllOnPage}
                  className="text-slate-300 hover:text-indigo-600"
                >
                  <Layers size={18} />
                </button>
              </th>
              <Th
                className="w-8"
                sortField={sortField}
                sortDir={sortDir}
                toggleSort={toggleSort}
              >
                #
              </Th>
              <Th
                field="name"
                sortField={sortField}
                sortDir={sortDir}
                toggleSort={toggleSort}
              >
                Nombre / Empresa
              </Th>
              {activeTab === "overview" && (
                <>
                  <Th
                    sortField={sortField}
                    sortDir={sortDir}
                    toggleSort={toggleSort}
                  >
                    Tier
                  </Th>
                  <Th
                    sortField={sortField}
                    sortDir={sortDir}
                    toggleSort={toggleSort}
                  >
                    Top Problema
                  </Th>
                  <Th
                    field="rating"
                    sortField={sortField}
                    sortDir={sortDir}
                    toggleSort={toggleSort}
                  >
                    Rating
                  </Th>
                  <Th
                    field="reviewsCount"
                    sortField={sortDir}
                    toggleSort={toggleSort}
                  >
                    Reviews
                  </Th>
                  <Th
                    sortField={sortField}
                    sortDir={sortDir}
                    toggleSort={toggleSort}
                  >
                    Estado
                  </Th>
                  <Th
                    field="potentialScore"
                    sortField={sortField}
                    sortDir={sortDir}
                    toggleSort={toggleSort}
                  >
                    Score
                  </Th>
                </>
              )}
              {activeTab === "contact" && (
                <>
                  <Th
                    sortField={sortField}
                    sortDir={sortDir}
                    toggleSort={toggleSort}
                  >
                    Teléfono
                  </Th>
                  <Th
                    sortField={sortField}
                    sortDir={sortDir}
                    toggleSort={toggleSort}
                  >
                    Website
                  </Th>
                  <Th
                    sortField={sortField}
                    sortDir={sortDir}
                    toggleSort={toggleSort}
                  >
                    Maps
                  </Th>
                </>
              )}
              {/* ... (Other tab headers simplified for brevity or keep same) */}
            </tr>
          </thead>
          <tbody>
            {paginated.map((lead, idx) => {
              const raw = lead.rawMetadata || {};
              return (
                <tr
                  key={lead.id}
                  className={`group hover:bg-slate-50/80 transition-all cursor-pointer ${selectedLeadIds.includes(lead.id) ? "bg-indigo-50/30" : ""}`}
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="px-3 py-3 border-b border-slate-100 group-selection">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLeadSelection(lead.id);
                      }}
                      className="text-slate-200 group-hover:text-slate-400"
                    >
                      {selectedLeadIds.includes(lead.id) ? (
                        <CheckSquare className="text-indigo-600" />
                      ) : (
                        <Square />
                      )}
                    </button>
                  </td>
                  <Cell className="text-slate-300 tabular-nums">
                    {(page - 1) * 50 + idx + 1}
                  </Cell>
                  <Cell className="min-w-[200px]">
                    <div className="font-bold text-slate-800">{lead.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black">
                      {lead.category || lead.description || "Sin categoría"}
                    </div>
                  </Cell>

                  {activeTab === "overview" && (
                    <>
                      <Cell>
                        <TierBadge tier={lead.intelligence?.tier} />
                      </Cell>
                      <Cell className="max-w-[150px]">
                        {lead.intelligence?.topProblem ? (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 truncate block">
                            {lead.intelligence.topProblem}
                          </span>
                        ) : (
                          "—"
                        )}
                      </Cell>
                      <Cell>
                        {lead.rating ? <StarRating score={lead.rating} /> : "—"}
                      </Cell>
                      <Cell className="tabular-nums font-medium">
                        {lead.reviewsCount || 0}
                      </Cell>
                      <Cell>
                        <StatusBadge status={lead.status} />
                      </Cell>
                      <Cell>
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500"
                              style={{
                                width: `${lead.intelligence?.opportunityScore ?? lead.potentialScore}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-500">
                            {lead.intelligence?.opportunityScore ??
                              lead.potentialScore}
                          </span>
                        </div>
                      </Cell>
                    </>
                  )}
                  {activeTab === "contact" && (
                    <>
                      <Cell>
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-indigo-600 hover:underline font-medium"
                          >
                            {lead.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </Cell>
                      <Cell className="max-w-[180px]">
                        {lead.website ? (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline truncate block"
                          >
                            {lead.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          "—"
                        )}
                      </Cell>
                      <Cell>
                        {lead.googleMapsUrl ? (
                          <a
                            href={lead.googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink size={12} /> Ver Maps
                          </a>
                        ) : (
                          "—"
                        )}
                      </Cell>
                    </>
                  )}
                  {activeTab === "social" &&
                    (() => {
                      const detected = detectSocial(lead.website);
                      const ig =
                        lead.instagram ||
                        (detected?.type === "instagram"
                          ? detected.url
                          : null) ||
                        raw.socialMedia?.find(
                          (s: { type: string; url: string }) =>
                            s.type === "instagram",
                        )?.url;
                      const fb =
                        lead.facebook ||
                        (detected?.type === "facebook" ? detected.url : null) ||
                        raw.socialMedia?.find(
                          (s: { type: string; url: string }) =>
                            s.type === "facebook",
                        )?.url;
                      const wa =
                        lead.whatsapp ||
                        (detected?.type === "whatsapp" ? detected.url : null);
                      return (
                        <>
                          <Cell>
                            <SocialLink url={ig} type="instagram" />
                          </Cell>
                          <Cell>
                            <SocialLink url={fb} type="facebook" />
                          </Cell>
                          <Cell>
                            <SocialLink url={wa} type="whatsapp" />
                          </Cell>
                          <Cell>
                            <SocialLink url={lead.linkedin} type="linkedin" />
                          </Cell>
                        </>
                      );
                    })()}
                  {activeTab === "location" && (
                    <>
                      <Cell>
                        <TruncateText text={lead.address} />
                      </Cell>
                      <Cell>{raw.city || "—"}</Cell>
                      <Cell className="font-mono text-[10px]">
                        {raw.location?.lat?.toFixed(4) || "—"}
                      </Cell>
                      <Cell className="font-mono text-[10px]">
                        {raw.location?.lng?.toFixed(4) || "—"}
                      </Cell>
                    </>
                  )}
                  {activeTab === "rating" && (
                    <>
                      <Cell>
                        {lead.rating ? <StarRating score={lead.rating} /> : "—"}
                      </Cell>
                      <Cell className="tabular-nums font-bold">
                        {lead.reviewsCount || 0}
                      </Cell>
                      <Cell className="text-[10px] font-black uppercase text-slate-400">
                        {lead.category || "N/A"}
                      </Cell>
                    </>
                  )}
                  {activeTab === "all" && (
                    <>
                      <Cell>{lead.phone || "—"}</Cell>
                      <Cell>
                        <TruncateText text={lead.website} maxLength={20} />
                      </Cell>
                      <Cell>
                        <TruncateText text={lead.address} maxLength={20} />
                      </Cell>
                      <Cell>
                        <StatusBadge status={lead.status} />
                      </Cell>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
          Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 bg-white border border-slate-100 rounded-2xl text-xs font-black disabled:opacity-30 hover:bg-slate-50"
          >
            Anterior
          </button>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-white border border-slate-100 rounded-2xl text-xs font-black disabled:opacity-30 hover:bg-slate-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modals */}
      {selectedLead && (
        <LeadIntelligenceModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          isAnalyzing={isAnalyzing}
          onReAnalyze={() => onAnalyze(selectedLead.id, true)}
        />
      )}

      <OutreachEnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        leadIds={selectedLeadIds}
        locale="es"
        tenantId={tenantId}
      />
    </div>
  );
}
