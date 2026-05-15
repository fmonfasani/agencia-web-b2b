"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import * as LucideIcons from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  Zap: LucideIcons.Zap,
  Users: LucideIcons.Users,
  Search: LucideIcons.Search,
  Activity: LucideIcons.Activity,
  Settings: LucideIcons.Settings,
  FileText: LucideIcons.FileText,
  DollarSign: LucideIcons.DollarSign,
  TrendingUp: LucideIcons.TrendingUp,
  Target: LucideIcons.Target,
  FileCheck: LucideIcons.FileCheck,
  CreditCard: LucideIcons.CreditCard,
  Bot: LucideIcons.Bot,
  Layers: LucideIcons.Layers,
  Key: LucideIcons.Key,
  History: LucideIcons.History,
  ShieldCheck: LucideIcons.ShieldCheck,
  Palette: LucideIcons.Palette,
  BrainCircuit: LucideIcons.BrainCircuit,
  LayoutGrid: LucideIcons.LayoutGrid,
};

interface NavItemProps {
  href: string;
  iconName: string;
  label: string;
  isLocked?: boolean;
}

export default function SidebarNavItem({
  href,
  iconName,
  label,
  isLocked = false,
}: NavItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "#" && pathname.startsWith(href));
  const Icon = ICONS[iconName] || LucideIcons.HelpCircle;

  return (
    <Link
      href={isLocked ? "#" : href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "7px 12px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? "#475569" : isLocked ? "#C4C4C4" : "#6F6F6F",
        backgroundColor: isActive ? "#F1F5F9" : "transparent",
        borderLeft: isActive ? "3px solid #475569" : "3px solid transparent",
        textDecoration: "none",
        transition: "all 120ms ease",
        cursor: isLocked ? "not-allowed" : "pointer",
        opacity: isLocked ? 0.5 : 1,
      }}
      className={
        !isLocked && !isActive ? "hover:bg-[#F7F6F3] hover:!text-[#111111]" : ""
      }
      onClick={(e) => isLocked && e.preventDefault()}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon
          size={15}
          strokeWidth={isActive ? 2 : 1.5}
          style={{
            flexShrink: 0,
            color: isActive ? "#475569" : "currentColor",
          }}
        />
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>

      {isLocked && (
        <Lock size={11} style={{ color: "#C4C4C4", flexShrink: 0 }} />
      )}
    </Link>
  );
}
