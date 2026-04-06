"use client";

import NeuralGrid from "./NeuralGrid";
import LiveActivityFeed from "./LiveActivityFeed";

interface Stat {
  label: string;
  value: string;
}

interface AuthRightPanelProps {
  tagline: string;
  stats: Stat[];
  activeDot?: number;
}

export default function AuthRightPanel({
  tagline,
  stats,
  activeDot = 0,
}: AuthRightPanelProps) {
  return (
    <div className="hidden lg:flex flex-1 relative flex-col overflow-hidden bg-[#030303]">
      {/* Neural grid */}
      <NeuralGrid />

      {/* Subtle central glow */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.015] rounded-full blur-[140px] pointer-events-none" />

      {/* Top fade */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#030303] to-transparent pointer-events-none z-10" />

      {/* Center content */}
      <div className="relative z-20 flex flex-col items-center justify-center flex-1 px-16 py-20 gap-12">
        {/* Tagline */}
        <div className="text-center max-w-sm">
          <p className="text-white/90 font-semibold text-2xl leading-snug tracking-tight whitespace-pre-line">
            {tagline}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-500 ${
                  i === activeDot
                    ? "w-5 h-[2px] bg-white/60"
                    : "w-[3px] h-[3px] bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Live activity feed */}
        <div className="w-full max-w-[300px]">
          <LiveActivityFeed />
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#030303] to-transparent pointer-events-none z-10" />

      {/* Stats */}
      <div className="relative z-20 px-10 pb-10 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl px-4 py-3.5 border border-white/[0.06] bg-white/[0.02]"
          >
            <p className="text-white font-bold text-xl leading-none tracking-tight">
              {stat.value}
            </p>
            <p className="text-white/25 text-[9px] mt-1.5 uppercase tracking-[0.12em] font-medium">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom security */}
      <div className="relative z-20 pb-5 flex items-center justify-center gap-2">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-2.5 h-2.5 text-white/15"
        >
          <path
            d="M8 1L2 4v4c0 3.5 2.5 6.7 6 7.5C11.5 14.7 14 11.5 14 8V4L8 1z"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-white/15 text-[9px] font-medium uppercase tracking-[0.15em]">
          TLS 1.3 · SOC 2 Type II · ISO 27001
        </span>
      </div>
    </div>
  );
}
