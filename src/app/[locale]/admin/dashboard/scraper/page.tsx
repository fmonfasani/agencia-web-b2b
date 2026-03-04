import { requireAuth } from "@/lib/auth/request-auth";
import { redirect } from "next/navigation";
import ScraperForm from "@/components/admin/ScraperForm";
import { ArrowLeft, Map } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

export default async function ScraperPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const auth = await requireAuth();

    if (!auth) {
        redirect(`/${locale}/auth/sign-in`);
    }

    // Intentar obtener tenantId del header, sino del session
    let tenantId = auth.session.tenantId || "";
    try {
        const headersList = await headers();
        const fromHeader = headersList.get("x-tenant-id");
        if (fromHeader) tenantId = fromHeader;
    } catch {
        // No header disponible, usamos el de la sesión
    }

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/${locale}/admin/dashboard`}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-xl bg-orange-100 flex items-center justify-center">
                            <Map size={16} className="text-orange-600" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            Google Maps Scraper
                        </h1>
                    </div>
                    <p className="text-slate-500 mt-1">
                        Extrae leads automáticamente de Google Maps e ingrésalos al CRM.
                    </p>
                </div>
            </div>

            {/* Card principal */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
                <ScraperForm
                    locale={locale}
                    tenantId={tenantId}
                />
            </div>

            {/* Nota legal */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700 leading-relaxed">
                <strong>⚠️ Nota:</strong> Esta herramienta extrae información pública de
                negocios (nombre, teléfono, web, rating) disponible en Google Maps.
                Usala de forma responsable y solo para contacto comercial B2B. No
                incluye datos personales privados.
            </div>
        </div>
    );
}
