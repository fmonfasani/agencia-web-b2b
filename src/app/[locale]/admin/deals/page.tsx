import { db } from "@/lib/scoped-prisma";
import { requireTenantMembership } from "@/lib/authz";
import DealKanban from "@/components/deals/DealKanban";
import { updateDealStageAction } from "@/app/actions/deals";
import { Building2, Plus, Search } from "lucide-react";
import { DealStage } from "@prisma/client";

export default async function DealsPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // 1. Security & Context
    const { user, tenantId } = await requireTenantMembership();
    const userId = (user as { id?: string; userId?: string })?.id ??
        (user as { id?: string; userId?: string })?.userId;
    if (!userId || !tenantId) {
        throw new Error("TENANT_CONTEXT_REQUIRED");
    }
    const scopedDb = await db({ userId, tenantId });

    // 2. Data Fetching (Scoped) - Now including the 'lead' relation
    const deals = await scopedDb.deal.findMany({
        include: {
            lead: true,
        },
        orderBy: { updatedAt: "desc" },
    });

    // Client-side action wrapper compatible with Kanban component
    const handleStageChange = async (dealId: string, newStage: DealStage) => {
        "use server";
        return updateDealStageAction(dealId, newStage);
    };

    return (
        <div className="p-8 max-w-full mx-auto space-y-8 h-screen flex flex-col">
            {/* HEADER */}
            <div className="flex items-end justify-between shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                            REVENUE CRM
                        </span>
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-widest">
                            Live Pipeline
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        Ventas & Cierres
                    </h1>
                    <p className="text-slate-500 mt-1 max-w-lg">
                        Gestión visual del pipeline comercial. Colaboración híbrida entre humanos y agentes IA.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
                        <Plus size={16} />
                        Nueva Oportunidad
                    </button>
                </div>
            </div>

            {/* CRM KANBAN */}
            <div className="flex-1 min-h-0">
                <DealKanban
                    initialDeals={deals as any}
                    onStageChange={updateDealStageAction}
                />
            </div>
        </div>
    );
}
