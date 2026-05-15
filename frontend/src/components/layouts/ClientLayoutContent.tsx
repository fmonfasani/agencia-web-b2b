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
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import type { Session } from "next-auth";

interface ClientLayoutContentProps {
  children: React.ReactNode;
  locale: string;
  session: Session | null;
}

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "ANALISTA"
  | "CLIENTE"
  | "MEMBER"
  | "VIEWER";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
  isAI?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export default function ClientLayoutContent({
  children,
  locale,
  session,
}: ClientLayoutContentProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();

  const isExpanded = !isCollapsed || isHovered;
  const userRole = (session?.user?.role as Role) ?? "CLIENTE";

  const navGroups: NavGroup[] = [
    {
      label: "Core",
      items: [
        {
          href: `/${locale}/app`,
          label: "Dashboard",
          icon: Home,
          roles: [
            "SUPER_ADMIN",
            "ADMIN",
            "ANALISTA",
            "CLIENTE",
            "MEMBER",
            "VIEWER",
          ],
        },
        {
          href: `/${locale}/app/agents`,
          label: "Mis Agentes",
          icon: Cpu,
          roles: ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE"],
        },
        {
          href: `/${locale}/app/chat`,
          label: "Chat IA",
          icon: Zap,
          roles: ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE", "MEMBER"],
          isAI: true,
        },
      ],
    },
    {
      label: "IA",
      items: [
        {
          href: `/${locale}/app/training`,
          label: "Entrenamiento",
          icon: BrainCircuit,
          roles: ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE"],
          isAI: true,
        },
        {
          href: `/${locale}/app/marketplace`,
          label: "Marketplace",
          icon: ShoppingBag,
          roles: ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE"],
        },
        {
          href: `/${locale}/app/observability`,
          label: "Observabilidad",
          icon: BarChart3,
          roles: ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE"],
        },
        {
          href: `/${locale}/app/lab`,
          label: "Agent Lab",
          icon: FlaskConical,
          roles: ["SUPER_ADMIN", "ADMIN", "ANALISTA"],
          isAI: true,
        },
      ],
    },
    {
      label: "Admin",
      items: [
        {
          href: `/${locale}/app/billing`,
          label: "Facturación",
          icon: CreditCard,
          roles: ["SUPER_ADMIN", "ADMIN", "CLIENTE"],
        },
        {
          href: `/${locale}/app/reports`,
          label: "Reportes",
          icon: FileText,
          roles: [
            "SUPER_ADMIN",
            "ADMIN",
            "ANALISTA",
            "CLIENTE",
            "MEMBER",
            "VIEWER",
          ],
        },
        {
          href: `/${locale}/app/settings`,
          label: "Configuración",
          icon: Settings,
          roles: ["SUPER_ADMIN", "ADMIN", "CLIENTE"],
        },
        {
          href: `/${locale}/app/settings/team`,
          label: "Equipo",
          icon: Users,
          roles: ["SUPER_ADMIN", "ADMIN", "CLIENTE"],
        },
        {
          href: `/${locale}/app/settings/webhooks`,
          label: "Webhooks",
          icon: Webhook,
          roles: ["SUPER_ADMIN", "ADMIN", "CLIENTE"],
        },
        {
          href: `/${locale}/app/settings/activity`,
          label: "Activity Log",
          icon: Activity,
          roles: ["SUPER_ADMIN", "ADMIN", "CLIENTE"],
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    // Exact match for dashboard, prefix match for the rest
    if (href === `/${locale}/app`) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#F7F6F3" }}>
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col transition-all duration-200 ease-in-out flex-shrink-0"
        style={{
          width: isExpanded ? 240 : 64,
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid #E5E3DF",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo + Toggle */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "16px 16px",
            borderBottom: "1px solid #E5E3DF",
            height: 56,
          }}
        >
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <WebshooksLogo variant="lockup" theme="light" fontSize={14} />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              padding: 6,
              borderRadius: 6,
              color: "#9A9A9A",
              backgroundColor: "transparent",
              transition: "background-color 120ms ease",
              flexShrink: 0,
              marginLeft: isExpanded ? 8 : "auto",
            }}
            className="hover:bg-[#F7F6F3]"
            title={isExpanded ? "Colapsar sidebar" : "Expandir sidebar"}
          >
            {isExpanded ? (
              <ChevronLeft size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: "8px 8px" }}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.includes(userRole),
            );
            if (visibleItems.length === 0) return null;

            return (
              <div
                key={group.label}
                style={{ marginTop: isExpanded ? 24 : 16 }}
              >
                {/* Group label */}
                {isExpanded && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "#9A9A9A",
                      paddingLeft: 12,
                      marginBottom: 4,
                    }}
                  >
                    {group.label}
                  </div>
                )}

                {/* Items */}
                <div className="flex flex-col" style={{ gap: 1 }}>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={!isExpanded ? item.label : undefined}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: isExpanded ? "8px 12px" : "8px",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: active ? 600 : 400,
                          color: active ? "#475569" : "#6F6F6F",
                          backgroundColor: active ? "#F1F5F9" : "transparent",
                          borderLeft: active
                            ? "3px solid #475569"
                            : "3px solid transparent",
                          transition: "all 120ms ease",
                          textDecoration: "none",
                          justifyContent: isExpanded ? "flex-start" : "center",
                          position: "relative",
                        }}
                        className="hover:bg-[#F7F6F3] hover:!text-[#111111]"
                      >
                        <Icon
                          size={18}
                          strokeWidth={active ? 2 : 1.5}
                          style={{ flexShrink: 0 }}
                        />
                        {isExpanded && (
                          <span style={{ flex: 1, minWidth: 0 }}>
                            {item.label}
                          </span>
                        )}
                        {/* AI dot indicator */}
                        {isExpanded && item.isAI && (
                          <span
                            style={{
                              display: "inline-block",
                              width: 6,
                              height: 6,
                              backgroundColor: "#E07A2F",
                              borderRadius: "50%",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer — user info */}
        <div
          style={{
            borderTop: "1px solid #E5E3DF",
            padding: 12,
          }}
        >
          {isExpanded ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                {/* Avatar */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "#F1F5F9",
                    border: "1px solid #E5E3DF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#475569",
                  }}
                >
                  {(session?.user?.email?.[0] ?? "U").toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#111111",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {session?.user?.email || "Usuario"}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#9A9A9A",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {(session?.user?.role as string) || "Cliente"}
                  </p>
                </div>
              </div>
              <Link
                href="/api/auth/signout"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#9A9A9A",
                  border: "1px solid #E5E3DF",
                  textDecoration: "none",
                  transition: "all 120ms ease",
                }}
                className="hover:bg-[#F7F6F3] hover:!text-[#111111]"
              >
                <LogOut size={14} />
                Cerrar sesión
              </Link>
            </>
          ) : (
            <Link
              href="/api/auth/signout"
              title="Cerrar sesión"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 8,
                borderRadius: 8,
                color: "#9A9A9A",
                textDecoration: "none",
              }}
              className="hover:bg-[#F7F6F3] hover:!text-[#111111]"
            >
              <LogOut size={16} />
            </Link>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          style={{
            height: 56,
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid #E5E3DF",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 32px",
            gap: 12,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto" style={{ padding: 32 }}>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </main>
      </div>
    </div>
  );
}
