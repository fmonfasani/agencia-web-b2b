import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded", className)} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E3DF",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <Skeleton className="h-6 w-1/3 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonKPICard() {
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
      {/* Icon + trend row */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="skeleton-shimmer"
          style={{ height: 32, width: 32, borderRadius: 8 }}
        />
        <div
          className="skeleton-shimmer"
          style={{ height: 20, width: 52, borderRadius: 9999 }}
        />
      </div>
      {/* Value */}
      <div
        className="skeleton-shimmer"
        style={{ height: 28, width: "55%", borderRadius: 6, marginBottom: 8 }}
      />
      {/* Label */}
      <div
        className="skeleton-shimmer"
        style={{ height: 12, width: "38%", borderRadius: 4 }}
      />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E3DF",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#F7F6F3",
          borderBottom: "1px solid #E5E3DF",
          padding: "10px 16px",
          display: "flex",
          gap: 16,
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{
              height: 10,
              width: `${60 + ((i * 17) % 40)}px`,
              borderRadius: 4,
            }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            borderBottom: rowIdx < rows - 1 ? "1px solid #E5E3DF" : undefined,
            padding: "12px 16px",
            display: "flex",
            gap: 16,
            alignItems: "center",
          }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="skeleton-shimmer"
              style={{
                height: 14,
                width: `${80 + (((rowIdx + colIdx) * 23) % 60)}px`,
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
