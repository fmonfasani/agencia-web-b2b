import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DealKanban from "@/components/deals/DealKanban";
import { updateDealStageAction } from "@/app/actions/deals";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // Deals data is managed via backend API (not yet implemented).
  // Render UI with empty initial state.
  const deals: any[] = [];

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
          initialDeals={deals}
          onStageChange={updateDealStageAction}
        />
      </div>
    </div>
  );
}
