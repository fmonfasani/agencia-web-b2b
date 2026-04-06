import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Only platform-level admins go to /admin. Tenant owners (ADMIN) go to /app.
const ADMIN_ROLES = ["SUPER_ADMIN", "super_admin"];

export default async function SmartRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  const role = session.user.role ?? "MEMBER";

  if (ADMIN_ROLES.includes(role)) {
    redirect(`/${locale}/admin/dashboard`);
  }

  redirect(`/${locale}/app`);
}
