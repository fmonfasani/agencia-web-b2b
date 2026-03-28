import { redirect } from "next/navigation";
import TenantSelector from "@/components/auth/TenantSelector";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/server";

export default async function SelectTenantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireSession(locale);

  type MembershipWithTenant = {
    tenant: { id: string; name: string };
  };

  const memberships = await prisma.membership.findMany({
    where: {
      userId: session.userId,
      status: "ACTIVE",
    },
    include: { tenant: true },
  }) as MembershipWithTenant[];

  if (memberships.length === 0) {
    redirect(`/${locale}/login`);
  }

  if (memberships.length === 1) {
    redirect(`/${locale}/admin/dashboard`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200 space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Selecciona organización
        </h1>
        <p className="text-slate-500 text-sm">
          Tu usuario pertenece a múltiples tenants. Elige con cuál continuar.
        </p>
        <TenantSelector
          tenants={memberships.map((membership) => ({
            id: membership.tenant.id,
            name: membership.tenant.name,
          }))}
        />
      </div>
    </div>
  );
}
