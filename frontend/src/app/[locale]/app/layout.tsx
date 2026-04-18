"use client";

import React, { useState } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { WebshooksLogo } from "@/components/WebshooksLogo";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import { useSession } from "next-auth/react";

const ClientLayoutContent = ({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) => {
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = !isCollapsed || isHovered;

  const userRole = (session?.user as any)?.role ?? "";
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
      <aside
        className={`sidebar-light border-r border-[#E5E3DF] flex flex-col transition-all duration-300 ${
          isExpanded ? "w-60" : "w-16"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo / Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E3DF] relative">
          {isExpanded && (
            <div className="flex-1">
              <WebshooksLogo variant="lockup" theme="dark" fontSize={14} />
            </div>
          )}
          {!isExpanded && isHovered && (
            <div className="absolute left-1/2 -translate-x-1/2 w-12">
              <WebshooksLogo variant="lockup" theme="dark" fontSize={12} />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto p-1.5 hover:bg-[#E2E0DA] rounded-lg transition-colors text-[#6F6F6F]"
            title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isExpanded ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#9A9A9A] hover:bg-[#E2E0DA] hover:text-[#1C1C1C] transition-colors font-medium text-sm"
                title={!isExpanded ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {isExpanded && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#E5E3DF] bg-[#F7F6F3]">
          <div className="p-3">
            {isExpanded && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-[#E2E0DA] rounded-full flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1C1C1C] truncate">
                      {session?.user?.email || "Usuario"}
                    </p>
                    <p className="text-xs text-[#9A9A9A] truncate">
                      {(session?.user as any)?.role || "Cliente"}
                    </p>
                  </div>
                </div>
                <Link
                  href="/api/auth/signout"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#9A9A9A] hover:bg-[#E2E0DA] hover:text-[#1C1C1C] rounded-lg transition-colors border border-[#E5E3DF]"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </Link>
              </>
            )}
            {!isExpanded && isHovered && (
              <Link
                href="/api/auth/signout"
                className="flex items-center justify-center w-full p-2 text-sm hover:bg-[#E2E0DA] rounded-lg transition-colors text-[#9A9A9A]"
                title="Sign out"
              >
                <LogOut size={18} />
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col bg-[#F1EFEA]">
        {/* Topbar */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E5E3DF] px-8 py-4 flex items-center justify-end gap-3 shadow-sm">
          <NotificationBell />
        </div>
        <div className="p-8 w-full">
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </div>
      </main>
    </div>
  );
};

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

  return <ClientLayoutContent locale={locale}>{children}</ClientLayoutContent>;
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
