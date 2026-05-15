"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import * as LucideIcons from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  Zap: LucideIcons.Zap,
  Users: LucideIcons.Users,
  Activity: LucideIcons.Activity,
  Search: LucideIcons.Search,
  Settings: LucideIcons.Settings,
  FileText: LucideIcons.FileText,
  BarChart3: LucideIcons.BarChart3,
  Briefcase: LucideIcons.Briefcase,
  Handshake: LucideIcons.Handshake,
  Megaphone: LucideIcons.Megaphone,
  Cpu: LucideIcons.Cpu,
  Database: LucideIcons.Database,
  ShieldCheck: LucideIcons.ShieldCheck,
  LayoutDashboard: LucideIcons.LayoutDashboard,
  PieChart: LucideIcons.PieChart,
  Target: LucideIcons.Target,
  FileCheck: LucideIcons.FileCheck,
  CreditCard: LucideIcons.CreditCard,
  Bot: LucideIcons.Bot,
  Layers: LucideIcons.Layers,
  Key: LucideIcons.Key,
  History: LucideIcons.History,
  Building2: LucideIcons.Building2,
};

interface SidebarCategoryProps {
  label: string;
  iconName: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function SidebarCategory({
  label,
  iconName,
  children,
  defaultOpen = false,
}: SidebarCategoryProps) {
  const [userIsOpen, setUserIsOpen] = useState<boolean | null>(null);
  const pathname = usePathname();
  const Icon = ICONS[iconName] || LucideIcons.HelpCircle;

  const hasActiveChild = React.Children.toArray(children).some(
    (child) =>
      React.isValidElement(child) &&
      typeof (child.props as { href?: string }).href === "string" &&
      (child.props as { href: string }).href !== "#" &&
      pathname.startsWith((child.props as { href: string }).href),
  );

  const isOpen =
    userIsOpen !== null ? userIsOpen : defaultOpen || hasActiveChild;

  return (
    <div style={{ marginTop: 4 }}>
      {/* Group header — overline style */}
      <button
        onClick={() => setUserIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "#9A9A9A",
          backgroundColor: "transparent",
          transition: "color 120ms ease",
          cursor: "pointer",
        }}
        className="hover:!text-[#6F6F6F]"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon size={12} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span>{label}</span>
        </div>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {isOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            paddingTop: 2,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
