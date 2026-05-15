"use client";

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
    label?: string;
  };
  icon?: "users" | "dollar-sign" | "zap" | "activity" | "trending-up";
  accentColor?: "blue" | "orange" | "green" | "gray" | "slate";
  loading?: boolean;
  animated?: boolean;
  description?: string;
}

const accentMap: Record<string, { bg: string; text: string; subtle: string }> =
  {
    blue: { bg: "#3B82F6", text: "#FFFFFF", subtle: "#EAF2FF" },
    orange: { bg: "#E07A2F", text: "#FFFFFF", subtle: "#FEF3E8" },
    green: { bg: "#16A34A", text: "#FFFFFF", subtle: "#E8F8F0" },
    gray: { bg: "#9A9A9A", text: "#FFFFFF", subtle: "#F7F6F3" },
    slate: { bg: "#475569", text: "#FFFFFF", subtle: "#F1F5F9" },
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
  accentColor = "slate",
  loading = false,
  animated = true,
  description,
}: KPICardProps) {
  const numValue =
    typeof value === "number"
      ? value
      : parseInt(String(value).replace(/[^0-9]/g, "")) || 0;
  const animatedValue = useCountUp(numValue, 1.2, 0);
  const displayValue =
    typeof value === "string" ? value : animated ? animatedValue : value;

  const accent = accentMap[accentColor] ?? accentMap.slate;
  const Icon = icon ? iconMap[icon] : undefined;

  const trendPositive = trend?.isPositive ?? true;
  const TrendIcon = trendPositive ? ArrowUpIcon : ArrowDownIcon;
  const trendColor = trendPositive ? "#16A34A" : "#EF4444";

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E3DF",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* Icon skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="skeleton-shimmer"
            style={{ height: 32, width: 32, borderRadius: 8 }}
          />
          <div
            className="skeleton-shimmer"
            style={{ height: 16, width: 48, borderRadius: 4 }}
          />
        </div>
        {/* Value skeleton */}
        <div
          className="skeleton-shimmer"
          style={{ height: 32, width: "60%", borderRadius: 6, marginBottom: 8 }}
        />
        {/* Label skeleton */}
        <div
          className="skeleton-shimmer"
          style={{ height: 14, width: "40%", borderRadius: 4 }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E3DF",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        transition: "box-shadow 150ms ease, transform 150ms ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 4px 12px rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLDivElement).style.transform =
          "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 1px 3px rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Header row: icon + trend */}
      <div
        className="flex items-start justify-between"
        style={{ marginBottom: 16 }}
      >
        {/* Icon with subtle background */}
        {Icon ? (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: accent.subtle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={16} style={{ color: accent.bg }} strokeWidth={2} />
          </div>
        ) : (
          <div style={{ width: 32 }} />
        )}

        {/* Trend badge */}
        {trend && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              fontSize: 12,
              fontWeight: 600,
              color: trendColor,
              backgroundColor: trendPositive ? "#E8F8F0" : "#FEECEC",
              padding: "2px 8px",
              borderRadius: 9999,
            }}
          >
            <TrendIcon size={11} strokeWidth={2.5} />
            <span>
              {trendPositive ? "+" : "-"}
              {Math.abs(trend.value)}%
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <p
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#111111",
          lineHeight: 1.2,
          marginBottom: 4,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {typeof value === "string" ? value : displayValue.toLocaleString()}
      </p>

      {/* Label */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 400,
          color: "#6F6F6F",
          lineHeight: 1.4,
        }}
      >
        {label}
      </p>

      {/* Description / trend label */}
      {(description || trend?.label) && (
        <p
          style={{
            fontSize: 11,
            color: "#9A9A9A",
            marginTop: 4,
          }}
        >
          {trend?.label ?? description}
        </p>
      )}
    </div>
  );
}
