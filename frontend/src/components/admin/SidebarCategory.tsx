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

  // Derive if it should be open based on children and pathname
  const hasActiveChild = React.Children.toArray(children).some((child) => {
    return (
      React.isValidElement(child) &&
      (child.props as { href?: string }).href === pathname
    );
  });

  const isOpen =
    userIsOpen !== null ? userIsOpen : defaultOpen || hasActiveChild;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setUserIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all group ${
          isOpen
            ? "text-white"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon
            size={18}
            className={
              isOpen
                ? "text-white animate-pulse"
                : "text-slate-500 group-hover:text-white"
            }
          />
          <span>{label}</span>
        </div>
        {isOpen ? (
          <ChevronDown size={14} className="text-slate-500" />
        ) : (
          <ChevronRight size={14} className="text-slate-600" />
        )}
      </button>

      {isOpen && (
        <div className="ml-4 pl-4 border-l border-white/10 space-y-1 py-1 animate-in fade-in slide-in-from-left-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
