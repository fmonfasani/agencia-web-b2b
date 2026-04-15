import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Database } from "lucide-react";
import LeadsDataTable from "@/components/admin/LeadsDataTable";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/auth/sign-in`);

  // Leads data is managed via backend API (not yet implemented).
  // Render UI with empty initial state.
  const leads: any[] = [];

  const stats = {
    total: 0,
    scraped: 0,
    withPhone: 0,
    withWebsite: 0,
    avgScore: 0,
  };

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
            {
              label: "Total leads",
              value: stats.total,
              icon: "🎯",
              color: "bg-blue-50 text-blue-700 border-blue-100",
            },
            {
              label: "Scraperos",
              value: stats.scraped,
              icon: "🤖",
              color: "bg-purple-50 text-purple-700 border-purple-100",
            },
            {
              label: "Con teléfono",
              value: stats.withPhone,
              icon: "📞",
              color: "bg-green-50 text-green-700 border-green-100",
            },
            {
              label: "Con website",
              value: stats.withWebsite,
              icon: "🌐",
              color: "bg-orange-50 text-orange-700 border-orange-100",
            },
            {
              label: "Score promedio",
              value: `${stats.avgScore}/100`,
              icon: "⭐",
              color: "bg-amber-50 text-amber-700 border-amber-100",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border px-4 py-3 ${stat.color}`}
            >
              <div className="text-xl font-bold tabular-nums">{stat.value}</div>
              <div className="text-xs opacity-70 mt-0.5 flex items-center gap-1">
                <span>{stat.icon}</span> {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <LeadsDataTable leads={leads} />
        </div>
      </div>
    </div>
  );
}
