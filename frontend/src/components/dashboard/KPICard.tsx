"use client";

import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  Users,
  DollarSign,
  Zap,
  Activity,
  TrendingUp,
  LucideIcon,
} from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: "users" | "dollar-sign" | "zap" | "activity" | "trending-up";
  accentColor?: "blue" | "orange" | "green" | "gray";
  loading?: boolean;
  animated?: boolean;
}

const accentColorMap = {
  blue: "#3B82F6",
  orange: "#F97316",
  green: "#10B981",
  gray: "#9CA3AF",
};

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  "dollar-sign": DollarSign,
  zap: Zap,
  activity: Activity,
  "trending-up": TrendingUp,
};

export function KPICard({
  label,
  value,
  trend,
  icon,
  accentColor = "blue",
  loading = false,
  animated = true,
}: KPICardProps) {
  // Extract numeric value for animation
  const numValue =
    typeof value === "number"
      ? value
      : parseInt(String(value).replace(/[^0-9]/g, "")) || 0;
  const animatedValue = useCountUp(numValue, 1.2, 0);
  const displayValue =
    typeof value === "string" ? value : animated ? animatedValue : value;

  const trendColorClass = trend?.isPositive
    ? "text-[#10B981]"
    : "text-[#DC2626]";
  const TrendIcon = trend?.isPositive ? ArrowUpIcon : ArrowDownIcon;
  const Icon = icon ? iconMap[icon] : undefined;

  const accentHex = accentColorMap[accentColor];

  return (
    <motion.div
      className="bg-white border border-[#E5E7EB] border-l-4 rounded-lg p-6 transition-all hover:shadow-lg"
      style={{ borderLeftColor: accentHex }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ translateY: -2 }}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          {label}
        </h3>
        {Icon && <Icon size={20} style={{ color: accentHex }} />}
      </div>

      <div className="mb-3">
        {loading ? (
          <motion.div
            className="h-10 w-24 bg-[#E5E7EB] rounded"
            animate={{
              backgroundColor: ["#E5E7EB", "#F3F4F6", "#E5E7EB"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        ) : (
          <motion.p
            className="text-4xl font-bold text-[#111111]"
            key={displayValue}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {typeof value === "string" ? value : displayValue.toLocaleString()}
          </motion.p>
        )}
      </div>

      {trend && (
        <div
          className={`flex items-center gap-1 text-sm font-medium ${trendColorClass}`}
        >
          <TrendIcon size={16} />
          <span>
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}% vs mes anterior
          </span>
        </div>
      )}
    </motion.div>
  );
}
