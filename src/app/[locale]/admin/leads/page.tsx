import { redirect } from "next/navigation";
import { requireTenantMembership } from "@/lib/authz";
import { db } from "@/lib/scoped-prisma";
import { Database } from "lucide-react";
import LeadsDataTable from "@/components/admin/LeadsDataTable";
import type { Lead } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
    const auth = await requireTenantMembership(["ADMIN", "SUPER_ADMIN"]);
    if (!auth) redirect("/auth/login");

    const userId = (auth.user as { id?: string; userId?: string })?.id ??
        (auth.user as { id?: string; userId?: string })?.userId;
    if (!userId || !auth.tenantId) {
        throw new Error("TENANT_CONTEXT_REQUIRED");
    }
    const scopedDb = await db({ userId, tenantId: auth.tenantId });

    const leads = await scopedDb.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
        select: {
            id: true,
            name: true,
            phone: true,
            website: true,
            address: true,
            description: true,
            category: true,
            rating: true,
            reviewsCount: true,
            googleMapsUrl: true,
            googlePlaceId: true,
            instagram: true,
            facebook: true,
            whatsapp: true,
            linkedin: true,
            tiktok: true,
            status: true,
            potentialScore: true,
            sourceType: true,
            createdAt: true,
            rawMetadata: true,
            intelligence: true,
        },
    });

    const stats = {
        total: leads.length,
        scraped: leads.filter((l: (typeof leads)[0]) => l.sourceType === "SCRAPER").length,
        withPhone: leads.filter((l: (typeof leads)[0]) => l.phone).length,
        withWebsite: leads.filter((l: (typeof leads)[0]) => l.website).length,
        avgScore: leads.length
            ? Math.round(
                leads.reduce((a: number, l: (typeof leads)[0]) => a + l.potentialScore, 0) / leads.length
            )
            : 0,
    };

    const serialized = leads.map((l: (typeof leads)[0]) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
        rawMetadata: l.rawMetadata as Record<string, unknown> | null,
    }));

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-xl">
                                <Database className="w-6 h-6 text-blue-600" />
                            </div>
                            Base de Leads
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Todos los leads capturados por el scraper y cargados manualmente
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                        { label: "Total leads", value: stats.total, icon: "🎯", color: "bg-blue-50 text-blue-700 border-blue-100" },
                        { label: "Scraperos", value: stats.scraped, icon: "🤖", color: "bg-purple-50 text-purple-700 border-purple-100" },
                        { label: "Con teléfono", value: stats.withPhone, icon: "📞", color: "bg-green-50 text-green-700 border-green-100" },
                        { label: "Con website", value: stats.withWebsite, icon: "🌐", color: "bg-orange-50 text-orange-700 border-orange-100" },
                        { label: "Score promedio", value: `${stats.avgScore}/100`, icon: "⭐", color: "bg-amber-50 text-amber-700 border-amber-100" },
                    ].map((stat) => (
                        <div key={stat.label} className={`rounded-2xl border px-4 py-3 ${stat.color}`}>
                            <div className="text-xl font-bold tabular-nums">{stat.value}</div>
                            <div className="text-xs opacity-70 mt-0.5 flex items-center gap-1">
                                <span>{stat.icon}</span> {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <LeadsDataTable leads={serialized} />
                </div>
            </div>
        </div>
    );
}
