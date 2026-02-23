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
  const isActive = pathname === href;
  const Icon = ICONS[iconName] || LucideIcons.HelpCircle;

  return (
    <div className="relative group px-1">
      <Link
        href={isLocked ? "#" : href}
        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
          isActive
            ? "bg-white/10 text-white shadow-sm font-bold"
            : isLocked
              ? "text-slate-500 cursor-not-allowed opacity-60"
              : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon
            size={16}
            className={
              isActive
                ? "text-white"
                : "text-slate-500 group-hover:text-white transition-colors"
            }
          />
          <span className="truncate">{label}</span>
        </div>

        {isLocked && (
          <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <Lock size={12} className="text-slate-500" />
          </div>
        )}
      </Link>
    </div>
  );
}
