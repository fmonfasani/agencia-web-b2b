import React from "react";
import { prisma } from "@/lib/prisma";
import { requireTenantMembership } from "@/lib/authz";
import BrandingSettingsForm from "@/components/admin/BrandingSettingsForm";
import { updateTenantBranding } from "@/app/actions/tenant/branding";
import { Globe } from "lucide-react";

export default async function BrandingSettingsPage() {
    const { tenantId } = await requireTenantMembership(["ADMIN", "SUPER_ADMIN"]);

    if (!tenantId) {
        return <div>No tenant context found.</div>;
    }

    let branding = {
        primaryColor: "#4a7fa5",
        sidebarColor: "#2c3e55",
        accentColor: "#3b82f6",
        logoUrl: "",
        appName: "Revenue OS",
        subName: "Agencia Leads",
        fontFamily: "DM Sans",
        brandingEnabled: false,
    };

    try {
        const tenant = await (prisma.tenant as any).findUnique({
            where: { id: tenantId },
            select: { branding: true },
        });

        if (tenant?.branding) {
            branding = { ...branding, ...(tenant.branding as any) };
        }
    } catch (error) {
        console.error("Branding settings fetch error:", error);
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#4a7fa5]">
                    <Globe size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Configuración Global</span>
                </div>
                <h1 className="text-3xl font-black text-[#1a2623] tracking-tight">Identidad Visual</h1>
                <p className="text-[#374151] max-w-2xl">
                    Personaliza la apariencia de tu plataforma para que coincida con la marca de tu agencia.
                    Los cambios se aplicarán a todos los usuarios que accedan a este tenant.
                </p>
            </div>

            <BrandingSettingsForm
                initialData={branding}
                onSave={updateTenantBranding as any}
            />
        </div>
    );
}
