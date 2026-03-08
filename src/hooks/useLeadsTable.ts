"use client";

import { useState, useMemo } from "react";
import { Lead } from "@/types/leads"; // Assuming types exist or I'll create them

export type Tab = "overview" | "contact" | "social" | "location" | "rating" | "all";

interface UseLeadsTableProps {
    leads: Lead[];
    pageSize?: number;
}

export function useLeadsTable({ leads, pageSize = 50 }: UseLeadsTableProps) {
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [search, setSearch] = useState("");
    const [sortField, setSortField] = useState<string>("potentialScore");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

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

    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);

    const toggleLeadSelection = (id: string) => {
        setSelectedLeadIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAllOnPage = () => {
        const pageIds = paginated.map(l => l.id);
        const allSelected = pageIds.every(id => selectedLeadIds.includes(id));
        if (allSelected) {
            setSelectedLeadIds(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedLeadIds(prev => [...new Set([...prev, ...pageIds])]);
        }
    };

    const toggleSort = (field: string) => {
        if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortField(field); setSortDir("desc"); }
    };

    const handleAnalyze = async (leadId: string, force: boolean = false) => {
        setIsAnalyzing(true);
        try {
            const res = await fetch(`/api/leads/${leadId}/intelligence${force ? '?force=true' : ''}`, {
                method: "POST",
            });
            if (!res.ok) throw new Error("Analysis failed");
            const data = await res.json();

            // Return updated lead data
            const updatedLead = leads.find(l => l.id === leadId);
            if (updatedLead) {
                return { ...updatedLead, intelligence: data.data };
            }
            return null;
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            setIsAnalyzing(false);
        }
    };

    const exportCSV = (dataToExport: Lead[]) => {
        const headers = ["#", "Nombre", "Teléfono", "Website", "Dirección", "Categoría", "Rating", "Reviews", "Status"];
        const rows = dataToExport.map((l, i) => [
            i + 1, l.name, l.phone || "", l.website || "", l.address || "",
            l.description || "", l.rating || "", l.reviewsCount || "", l.status
        ]);
        const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
    };

    return {
        activeTab, setActiveTab,
        search, setSearch,
        sortField, setSortField,
        sortDir, setSortDir,
        page, setPage,
        selectedLeadIds, setSelectedLeadIds,
        selectedLead, setSelectedLead,
        isAnalyzing, setIsAnalyzing,
        filtered, paginated, totalPages,
        toggleLeadSelection, toggleAllOnPage, toggleSort,
        handleAnalyze, exportCSV
    };
}
