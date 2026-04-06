"use client";

import { ArrowUpIcon, ArrowDownIcon, LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  color?: "blue" | "green" | "red" | "yellow" | "purple";
  loading?: boolean;
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

export function KPICard({
  label,
  value,
  trend,
  icon: Icon,
  color = "blue",
  loading = false,
}: KPICardProps) {
  const trendColorClass = trend?.isPositive ? "text-green-600" : "text-red-600";
  const TrendIcon = trend?.isPositive ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div className={`border rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{label}</h3>
        {Icon && (
          <Icon size={24} className={`${iconColorClasses[color]}`} />
        )}
      </div>

      <div className="mb-2">
        {loading ? (
          <div className="h-10 w-24 bg-gray-300 rounded animate-pulse" />
        ) : (
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        )}
      </div>

      {trend && (
        <div className={`flex items-center text-sm ${trendColorClass}`}>
          <TrendIcon size={16} className="mr-1" />
          <span>
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}% vs mes anterior
          </span>
        </div>
      )}
    </div>
  );
}
