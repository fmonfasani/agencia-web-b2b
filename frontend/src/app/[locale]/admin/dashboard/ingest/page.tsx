import { requireAuth } from "@/lib/auth/request-auth";
import { redirect } from "next/navigation";
import LeadIngestForm from "@/components/admin/LeadIngestForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function LeadIngestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const auth = await requireAuth();

  if (!auth) {
    redirect(`/${locale}/auth/sign-in`);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/dashboard`}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Ingreso Manual de Lead
          </h1>
          <p className="text-slate-500">
            Añade un prospecto de forma manual al sistema de normalización.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
        <LeadIngestForm locale={locale} />
      </div>
    </div>
  );
}
