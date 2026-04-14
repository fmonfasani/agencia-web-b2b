// Server wrapper — role guard (ADMIN / SUPER_ADMIN / ANALISTA only)
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LabClient from "./LabClient";

export default async function AgentLabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  const role = ((session?.user as any)?.role ?? "").toUpperCase();
  if (!["ADMIN", "SUPER_ADMIN", "ANALISTA"].includes(role)) {
    redirect(`/${locale}/app`);
  }

  return <LabClient />;
}
