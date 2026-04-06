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
  color?: "blue" | "green" | "red" | "yellow" | "purple";
  loading?: boolean;
  animated?: boolean;
}

const colorClasses = {
  blue: "border-blue-200 bg-blue-50",
  green: "border-green-200 bg-green-50",
  red: "border-red-200 bg-red-50",
  yellow: "border-yellow-200 bg-yellow-50",
  purple: "border-purple-200 bg-purple-50",
};

const iconColorClasses = {
  blue: "text-blue-600",
  green: "text-green-600",
  red: "text-red-600",
  yellow: "text-yellow-600",
  purple: "text-purple-600",
};

const iconMap: Record<string, LucideIcon> = {
  "users": Users,
  "dollar-sign": DollarSign,
  "zap": Zap,
  "activity": Activity,
  "trending-up": TrendingUp,
};

export function KPICard({
  label,
  value,
  trend,
  icon,
  color = "blue",
  loading = false,
  animated = true,
}: KPICardProps) {
  // Extract numeric value for animation
  const numValue = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, "")) || 0;
  const animatedValue = useCountUp(numValue, 1.2, 0);
  const displayValue = typeof value === "string" ? value : animated ? animatedValue : value;

  const trendColorClass = trend?.isPositive ? "text-green-600" : "text-red-600";
  const TrendIcon = trend?.isPositive ? ArrowUpIcon : ArrowDownIcon;
  const Icon = icon ? iconMap[icon] : undefined;

  return (
    <motion.div
      className={`border rounded-lg p-6 ${colorClasses[color]} transition-all hover:shadow-lg`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ translateY: -2 }}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{label}</h3>
        {Icon && (
          <motion.div
            animate={{ rotate: 0 }}
            whileHover={{ rotate: 10 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Icon size={24} className={`${iconColorClasses[color]}`} />
          </motion.div>
        )}
      </div>

      <div className="mb-2">
        {loading ? (
          <motion.div
            className="h-10 w-24 bg-gray-300 rounded"
            animate={{
              backgroundColor: ["#d1d5db", "#e5e7eb", "#d1d5db"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        ) : (
          <motion.p
            className="text-3xl font-bold text-gray-900"
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
        <motion.div
          className={`flex items-center text-sm ${trendColorClass}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <motion.div
            animate={{ y: trend.isPositive ? -2 : 2 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          >
            <TrendIcon size={16} className="mr-1" />
          </motion.div>
          <span>
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}% vs mes anterior
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
