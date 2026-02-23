"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

type TenantOption = {
  id: string;
  name: string;
};

export default function TenantSelector({
  tenants,
}: {
  tenants: TenantOption[];
}) {
  const [selectedTenant, setSelectedTenant] = useState(tenants[0]?.id ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const locale = useLocale();
  const router = useRouter();

  async function onContinue() {
    setLoading(true);
    setError("");

    const response = await fetch(`/${locale}/api/auth/tenant`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: selectedTenant }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error || "No se pudo seleccionar la organización");
      setLoading(false);
      return;
    }

    router.push(`/${locale}/admin/dashboard`);
  }

  return (
    <div className="space-y-4">
      <select
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
        value={selectedTenant}
        onChange={(event) => setSelectedTenant(event.target.value)}
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        onClick={onContinue}
        disabled={!selectedTenant || loading}
        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Continuar"}
      </button>
    </div>
  );
}
