import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientLayoutContent from "@/components/layouts/ClientLayoutContent";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  return (
    <ClientLayoutContent locale={locale} session={session}>
      {children}
    </ClientLayoutContent>
  );
}
