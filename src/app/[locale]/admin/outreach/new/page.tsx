import { requireTenantMembership } from "@/lib/authz";
import OutreachNewCampaign from "@/components/admin/OutreachNewCampaign";

export default async function NewOutreachPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const { tenantId } = await requireTenantMembership(["ADMIN", "SUPER_ADMIN"]);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-8 md:p-12">
            <div className="max-w-4xl mx-auto">
                <OutreachNewCampaign locale={locale} tenantId={tenantId ?? ""} />
            </div>
        </div>
    );
}
