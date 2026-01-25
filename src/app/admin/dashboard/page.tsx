import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table"; // We'll create this simple component or use plain HTML first
import { Badge } from "@/components/ui/Badge"; // We'll create this or use plain HTML
import { formatDate } from "@/lib/utils"; // We'll check if utils exist, otherwise inline

// Inline components for simplicity in this step to avoid dependency hell
const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    NEW: "bg-blue-100 text-blue-700",
    CONTACTED: "bg-yellow-100 text-yellow-700",
    QUALIFIED: "bg-green-100 text-green-700",
    LOST: "bg-red-100 text-red-700",
  };
  const label = status || "NEW";
  const style = styles[label as keyof typeof styles] || styles.NEW;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Fetch leads directly from DB
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Gestiona tus prospectos y oportunidades de negocio.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-sm text-slate-500 block">Total Leads</span>
            <span className="text-xl font-bold text-slate-900">
              {leads.length}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">
                  Fecha
                </th>
                <th className="px-6 py-4 font-semibold text-slate-700">
                  Nombre
                </th>
                <th className="px-6 py-4 font-semibold text-slate-700">
                  Empresa
                </th>
                <th className="px-6 py-4 font-semibold text-slate-700">
                  Email
                </th>
                <th className="px-6 py-4 font-semibold text-slate-700">
                  Presupuesto
                </th>
                <th className="px-6 py-4 font-semibold text-slate-700">
                  Estado
                </th>
                <th className="px-6 py-4 font-semibold text-slate-700">
                  Mensaje
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No hay leads todavía.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {lead.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {lead.company || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{lead.email}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {lead.budget
                        ? lead.budget.replace("range_", "Rango ")
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td
                      className="px-6 py-4 text-slate-500 max-w-xs truncate"
                      title={lead.message}
                    >
                      {lead.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
