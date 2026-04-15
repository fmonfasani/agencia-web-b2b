import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function SelectTenantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // Multi-tenant selection is managed by backend-saas.
  // For now, redirect directly to the admin dashboard.
  redirect(`/${locale}/admin/dashboard`);
}
