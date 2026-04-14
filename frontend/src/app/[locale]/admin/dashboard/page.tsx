import { requireTenantMembership } from "@/lib/authz";
import ProductionControlCenter from "@/components/admin/ProductionControlCenter";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireTenantMembership();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Webshooks Control Center</h1>
        <p className="text-gray-600">
          Dashboard real de analytics, usage, agentes, tenants, API keys y billing.
        </p>
      </div>
      <ProductionControlCenter />
    </div>
  );
}
