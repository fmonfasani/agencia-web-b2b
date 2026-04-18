interface ScoreBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function ScoreBar({
  value,
  max = 100,
  label,
  showValue = true,
  className = "",
}: ScoreBarProps) {
  // Clamp value between 0 and max
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;

  // Determine color based on value
  let barColor = "#F97316"; // cold (orange) — 0-33
  if (percentage >= 34 && percentage <= 66) {
    barColor = "#3B82F6"; // warm (blue)
  } else if (percentage > 66) {
    barColor = "#10B981"; // hot (green)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1">
        {label && (
          <p className="text-xs font-medium text-[#6B7280] mb-1 uppercase tracking-wider">
            {label}
          </p>
        )}
        <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      </div>
      {showValue && (
        <span className="text-sm font-semibold text-[#111111] min-w-fit">
          {normalizedValue.toFixed(0)}
        </span>
      )}
    </div>
  );
}
