import AgentsPanel from "@/components/admin/agents/AgentsPanel";

export default async function AgentsPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    return (
        <div className="bg-[#fafafa] min-h-screen">
            <AgentsPanel locale={locale} />
        </div>
    );
}
