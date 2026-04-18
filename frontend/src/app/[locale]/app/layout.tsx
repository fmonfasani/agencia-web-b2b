import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  LogOut,
  Home,
  Cpu,
  ShoppingBag,
  BarChart3,
  CreditCard,
  Settings,
  FileText,
  Users,
  Webhook,
  Activity,
  BrainCircuit,
  FlaskConical,
  Zap,
} from "lucide-react";
import { WebshooksLogo } from "@/components/WebshooksLogo";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";

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

  const userRole = (session.user as any)?.role ?? "";
  const isAdminOrAnalista = ["ADMIN", "SUPER_ADMIN", "ANALISTA"].includes(
    userRole,
  );

  const navItems = [
    { href: `/${locale}/app`, label: "Dashboard", icon: Home },
    { href: `/${locale}/app/agents`, label: "Mis Agentes", icon: Cpu },
    {
      href: `/${locale}/app/training`,
      label: "Entrenamiento",
      icon: BrainCircuit,
    },
    { href: `/${locale}/app/chat`, label: "Chat IA", icon: Zap },
    {
      href: `/${locale}/app/marketplace`,
      label: "Marketplace",
      icon: ShoppingBag,
    },
    {
      href: `/${locale}/app/observability`,
      label: "Observabilidad",
      icon: BarChart3,
    },
    // Agent Lab — solo ADMIN, SUPER_ADMIN, ANALISTA
    ...(isAdminOrAnalista
      ? [{ href: `/${locale}/app/lab`, label: "Agent Lab", icon: FlaskConical }]
      : []),
    { href: `/${locale}/app/billing`, label: "Facturación", icon: CreditCard },
    { href: `/${locale}/app/reports`, label: "Reportes", icon: FileText },
    { href: `/${locale}/app/settings`, label: "Configuración", icon: Settings },
    { href: `/${locale}/app/settings/team`, label: "Equipo", icon: Users },
    {
      href: `/${locale}/app/settings/webhooks`,
      label: "Webhooks",
      icon: Webhook,
    },
    {
      href: `/${locale}/app/settings/activity`,
      label: "Activity Log",
      icon: Activity,
    },
  ];

  return (
    <div className="min-h-screen theme-client flex">
      {/* Sidebar */}
      <aside className="w-64 sidebar-dark border-r border-[#000000]/10 shadow-sm text-white">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <WebshooksLogo variant="lockup" theme="dark" fontSize={16} />
        </div>

        {/* Navigation */}
        <nav className="p-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white transition-colors font-medium text-sm"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-[#111111]">
          <div className="p-4 w-64">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#1F2937] rounded-full" />
              <div>
                <p className="text-sm font-medium text-white">
                  {session.user?.email || "Usuario"}
                </p>
                <p className="text-xs text-[#9CA3AF]">
                  {(session.user as any)?.role || "Cliente"}
                </p>
              </div>
            </div>
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white rounded-lg transition-colors border border-white/10"
            >
              <LogOut size={16} />
              Cerrar sesión
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col bg-[#FAFAFA]">
        {/* Topbar */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB] px-8 py-4 flex items-center justify-end gap-3 shadow-sm">
          <NotificationBell />
        </div>
        <div className="p-8 w-full">
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </div>
      </main>
    </div>
  );
}
