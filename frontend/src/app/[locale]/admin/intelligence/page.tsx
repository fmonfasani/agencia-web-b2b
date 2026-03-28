"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Globe,
  Zap,
  Download,
  LayoutDashboard,
  Trophy,
} from "lucide-react";
import axios from "axios";
import styles from "./intelligence.module.css";
import { StrategicBrief } from "@/components/leads/StrategicBrief";

// Configuración de Axios
const API_BASE_URL = process.env.NEXT_PUBLIC_INTEL_API_URL || "http://localhost:8000";
const api = axios.create({
  baseURL: API_BASE_URL,
});

interface Lead {
  id: string;
  name: string;
  rubro: string;
  sector: string;
  categoria: string;
  email: string;
  website: string;
  city?: string;
  digital_score_lice?: number;
  priority_score?: number;
  priority_tag?: string;
  confidence?: number;
  redes_detectadas?: string;
  tiene_web_propia?: number;
  correo_institucional?: number;
  whatsapp_number?: string;
  fuente?: string;
  strategic_brief?: string;
}

interface Taxonomy {
  [sector: string]: {
    [category: string]: string[];
  };
}

export default function LeadIntelligencePage() {
  const [activeTab, setActiveTab] = useState<"explorer" | "top">("explorer");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  interface SummaryData {
    totalLeads?: number;
    overallScore?: number;
    [key: string]: string | number | undefined | null;
  }

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({});

  // Filtros
  const [currentSector, setCurrentSector] = useState<string>("");
  const [currentCategory, setCurrentCategory] = useState<string>("");
  const [hasEmail, setHasEmail] = useState<string>("all");
  const [hasSocials, setHasSocials] = useState<string>("all");
  const [hasWhatsapp, setHasWhatsapp] = useState<string>("all");
  const [hasWebsite, setHasWebsite] = useState<string>("all");

  // Detalle de Lead (Modal)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchTaxonomy = useCallback(async () => {
    try {
      const res = await api.get("/taxonomy");
      setTaxonomy(res.data);
    } catch (err) {
      console.error("Error fetching taxonomy", err);
    }
  }, []);

  const fetchGlobalSummary = useCallback(async () => {
    try {
      const res = await api.get("/summary", {
        params: {
          sector: currentSector || undefined,
          category: currentCategory || undefined,
          q: query,
        },
      });
      setSummary(res.data);
    } catch (err) {
      console.error("Error fetching summary", err);
    }
  }, [currentSector, currentCategory, query]);

  const fetchLiceSummary = useCallback(async () => {
    try {
      const res = await api.get("/analytics/summary");
      setSummary(res.data);
    } catch (err) {
      console.error("Error fetching LICE summary", err);
    }
  }, []);

  const fetchTopLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/leads/top", { params: { limit: 100 } });
      setLeads(res.data.leads);
    } catch (err) {
      console.error("Error fetching top leads", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setLoading(true);
      try {
        const res = await api.get("/leads", {
          params: {
            sector: currentSector || undefined,
            categoria: currentCategory || undefined,
            has_email: hasEmail === "all" ? undefined : hasEmail,
            has_socials: hasSocials === "all" ? undefined : hasSocials === "yes",
            has_whatsapp: hasWhatsapp === "all" ? undefined : hasWhatsapp === "yes",
            has_website: hasWebsite === "all" ? undefined : hasWebsite === "yes",
            limit: 100,
          },
        });
        setLeads(res.data.leads);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    },
    [currentSector, currentCategory, hasEmail, hasSocials, hasWhatsapp, hasWebsite]
  );

  useEffect(() => {
    fetchTaxonomy();
  }, [fetchTaxonomy]);

  useEffect(() => {
    if (activeTab === "explorer") {
      fetchGlobalSummary();
      handleSearch();
    } else {
      fetchTopLeads();
      fetchLiceSummary();
    }
  }, [activeTab, fetchGlobalSummary, handleSearch, fetchTopLeads, fetchLiceSummary]);

  const handleContactClick = async (leadId: string) => {
    setLoadingDetail(true);
    setIsModalOpen(true);
    try {
      const res = await api.get(`/leads/${leadId}`);
      setSelectedLead(res.data);
    } catch (err) {
      console.error("Error fetching lead detail", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const LeadDetailModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3>Detalle del Lead</h3>
            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>×</button>
          </div>
          <div className={styles.modalBody}>
            {loadingDetail ? (
              <div className={styles.skeletonRow} style={{ height: "200px" }} />
            ) : selectedLead ? (
              <>
                <div className={styles.detailGrid}>
                  <div className={styles.detailSection}>
                    <div className={styles.statLabel}>Información General</div>
                    <div className={styles.detailItem}><strong>Nombre:</strong> {selectedLead.name}</div>
                    <div className={styles.detailItem}><strong>Sector:</strong> {selectedLead.sector}</div>
                    <div className={styles.detailItem}><strong>Categoría:</strong> {selectedLead.categoria}</div>
                    <div className={styles.detailItem}><strong>Email:</strong> {selectedLead.email || "N/A"}</div>
                    <div className={styles.detailItem}><strong>Web:</strong> {selectedLead.website || "N/A"}</div>
                    {selectedLead.whatsapp_number && (
                      <div className={styles.detailItem}><strong>WhatsApp:</strong> +{selectedLead.whatsapp_number}</div>
                    )}
                  </div>
                  <div className={styles.detailSection}>
                    <div className={styles.statLabel}>Inteligencia Digital</div>
                    <div className={styles.detailItem}><strong>Digital Score:</strong> {selectedLead.digital_score_lice}%</div>
                    <div className={styles.detailItem}><strong>Prioridad:</strong> {selectedLead.priority_score} ({selectedLead.priority_tag})</div>
                    <div className={styles.detailItem}><strong>Confianza IA:</strong> {Math.round((selectedLead.confidence || 0) * 100)}%</div>
                    <div className={styles.detailItem}><strong>Redes:</strong> {selectedLead.redes_detectadas || "Ninguna"}</div>
                    <div className={styles.detailItem}><strong>Web Propia:</strong> {selectedLead.tiene_web_propia ? "Sí" : "No"}</div>
                    <div className={styles.detailItem}><strong>Fuente:</strong> {selectedLead.fuente}</div>
                  </div>
                </div>

                <div style={{ marginTop: "24px" }}>
                  <StrategicBrief
                    brief={selectedLead.strategic_brief || null}
                    leadName={selectedLead.name}
                  />
                </div>
              </>
            ) : (
              <p>No se pudo cargar la información.</p>
            )}
          </div>
          <div className={styles.modalFooter}>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setIsModalOpen(false)}>Cerrar</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => window.open(`mailto:${selectedLead?.email}`)}>Enviar Email</button>
            {selectedLead?.whatsapp_number && (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ backgroundColor: "#25D366", borderColor: "#25D366" }}
                onClick={() => window.open(`https://wa.me/${selectedLead.whatsapp_number}`)}
              >
                WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.dashboardWrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <Zap size={20} color="#635bff" fill="#635bff" />
          <span>Lead Intel Hub</span>
        </div>
        <nav className={styles.sidebarNav}>
          <div className={`${styles.navItem} ${activeTab === "explorer" ? styles.navItemActive : ""}`} onClick={() => setActiveTab("explorer")}>
            <LayoutDashboard size={16} />
            <span>Explorador Global</span>
          </div>
          <div className={`${styles.navItem} ${activeTab === "top" ? styles.navItemActive : ""}`} onClick={() => setActiveTab("top")}>
            <Trophy size={16} />
            <span>Top Oportunidades</span>
          </div>
        </nav>
      </aside>

      <main className={styles.mainContainer}>
        <header className={styles.topBar}>
          <div className={styles.searchContainer}>
            <Search size={14} />
            <input type="text" placeholder="Buscar por nombre o empresa..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className={styles.topBarActions}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => window.open(`${API_BASE_URL}/classify/download/leads_prioritarios_alta.csv`)}>
              <Download size={14} /> Exportar
            </button>
          </div>
        </header>

        <div className={styles.pageContent}>
          <div className={styles.pageHeader}>
            <h2 className={styles.pageTitle}>{activeTab === "explorer" ? "Explorador de Inteligencia" : "Top Oportunidades"}</h2>
            <p className={styles.pageSubtitle}>{activeTab === "explorer" ? "Consulta y segmentación del universo completo de leads." : "Ranking de los leads con mayor potencial comercial detectado por LICE."}</p>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Analizados</div>
              <div className={styles.statValue}>{summary?.total_leads?.toLocaleString() || "42,983"}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Hot Leads (Alta)</div>
              <div className={styles.statValue}>924</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Avg. Digital score</div>
              <div className={styles.statValue}>{activeTab === "explorer" ? "12%" : "84%"}</div>
            </div>
          </div>

          {activeTab === "explorer" && (
            <div className={styles.filtersBar}>
              <select className={styles.filterSelect} value={currentSector} onChange={(e) => { setCurrentSector(e.target.value); setCurrentCategory(""); }}>
                <option value="">Todos los sectores</option>
                {Object.keys(taxonomy).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {currentSector && (
                <select className={styles.filterSelect} value={currentCategory} onChange={(e) => setCurrentCategory(e.target.value)}>
                  <option value="">Todas las categorías</option>
                  {Object.keys(taxonomy[currentSector]).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select className={styles.filterSelect} value={hasEmail} onChange={(e) => setHasEmail(e.target.value)}>
                <option value="all">Email: Todos</option>
                <option value="corp">Con Email Corp</option>
                <option value="gen">Con Email Gen.</option>
                <option value="any">Con Cualquier Email</option>
                <option value="none">Sin Email</option>
              </select>
              <select className={styles.filterSelect} value={hasSocials} onChange={(e) => setHasSocials(e.target.value)}>
                <option value="all">Redes: Todas</option>
                <option value="yes">Con Redes</option>
                <option value="no">Sin Redes</option>
              </select>
              <select className={styles.filterSelect} value={hasWhatsapp} onChange={(e) => setHasWhatsapp(e.target.value)}>
                <option value="all">WhatsApp: Todos</option>
                <option value="yes">Con WhatsApp</option>
                <option value="no">Sin WhatsApp</option>
              </select>
              <select className={styles.filterSelect} value={hasWebsite} onChange={(e) => setHasWebsite(e.target.value)}>
                <option value="all">Web Propia: Todas</option>
                <option value="yes">Con Web Propia</option>
                <option value="no">Sin Web Propia</option>
              </select>
            </div>
          )}

          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" /></th>
                  <th style={{ width: 220 }}>Empresa</th>
                  <th>Sector / Categoría</th>
                  <th>Ubicación</th>
                  <th>Contacto</th>
                  <th>Madurez</th>
                  <th>Web</th>
                  <th>Redes</th>
                  <th>WS</th>
                  <th>Priority</th>
                  <th>Conf.</th>
                  <th style={{ width: 110, textAlign: "right" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}><td colSpan={12}><div className={styles.skeletonRow} /></td></tr>
                  ))
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id}>
                      <td><input type="checkbox" /></td>
                      <td className={`${styles.textBold} ${styles.truncatedCell}`} title={lead.name}>{lead.name}</td>
                      <td>
                        <div className={styles.sectorCell}>{lead.sector}</div>
                        <div className={styles.textMute} style={{ fontSize: 11 }}>{lead.categoria}</div>
                      </td>
                      <td>{lead.city || "Buenos Aires"}</td>
                      <td className={styles.textMute}>
                        {lead.email || "N/A"}
                        {lead.email && lead.correo_institucional === 1 ? (
                          <span style={{ marginLeft: "6px", fontSize: "9px", background: "rgba(99, 91, 255, 0.1)", color: "#635bff", padding: "1px 4px", borderRadius: "3px", fontWeight: 600 }}>CORP</span>
                        ) : lead.email ? (
                          <span style={{ marginLeft: "6px", fontSize: "9px", background: "#f0f0f0", color: "#666", padding: "1px 4px", borderRadius: "3px", fontWeight: 600 }}>GEN</span>
                        ) : null}
                      </td>
                      <td>
                        <span className={styles.statusBadge} style={{ backgroundColor: (lead.digital_score_lice || 0) > 50 ? "#fff3cd" : "#cbf4c9", color: (lead.digital_score_lice || 0) > 50 ? "#856404" : "#0e6245" }}>
                          {lead.digital_score_lice || 0}%
                        </span>
                      </td>
                      <td>
                        {lead.tiene_web_propia ? (
                          <a href={lead.website} target="_blank" rel="noreferrer" title={lead.website}><Globe size={16} color="#635bff" /></a>
                        ) : (
                          <span className={styles.textMute}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "100px" }}>
                          {lead.redes_detectadas ? (
                            lead.redes_detectadas.split(",").map((r) => <span key={r} style={{ fontSize: "10px", background: "#f0f0f0", padding: "2px 4px", borderRadius: "4px" }}>{r.charAt(0).toUpperCase()}</span>)
                          ) : (
                            <span className={styles.textMute}>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {lead.redes_detectadas?.includes("whatsapp") ? (
                          <span style={{ color: "#25D366", fontSize: "12px", fontWeight: "bold" }}>Si</span>
                        ) : (
                          <span className={styles.textMute}>No</span>
                        )}
                      </td>
                      <td className={styles.textBold} style={{ color: (lead.priority_score || 0) >= 80 ? "#635bff" : "inherit" }}>{lead.priority_score || "--"}</td>
                      <td>
                        <div className={styles.textMute} style={{ fontSize: 11 }}>{Math.round((lead.confidence || 0) * 100)}%</div>
                        <div className={styles.confidenceBarBg}>
                          <div className={styles.confidenceBarFill} style={{ width: `${(lead.confidence || 0) * 100}%` }} />
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => handleContactClick(lead.id)}>Contactar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <LeadDetailModal />
    </div>
  );
}
