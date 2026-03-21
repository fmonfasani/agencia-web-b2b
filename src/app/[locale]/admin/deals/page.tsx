import { db } from "@/lib/scoped-prisma";
import { requireTenantMembership } from "@/lib/authz";
import DealKanban from "@/components/deals/DealKanban";
import { updateDealStageAction } from "@/app/actions/deals";
import { Plus } from "lucide-react";
import { DealStage, Deal } from "@prisma/client";

export default async function DealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 1. Security & Context
  const { user, tenantId } = await requireTenantMembership();
  const userId =
    (user as { id?: string; userId?: string })?.id ??
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

  return (
    <div className="flex flex-col h-full space-y-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline de Ventas</h1>
          <p className="text-slate-500">
            Gestiona tus prospectos y oportunidades en tiempo real.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <DealKanban
          initialDeals={deals as any[]}
          onStageChange={updateDealStageAction}
        />
      </div>
    </div>
  );
}
