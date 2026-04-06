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
    <div className="hidden lg:flex w-1/2 relative flex-col overflow-hidden bg-[#070a10]">
      {/* Neural grid background */}
      <NeuralGrid />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#135bec]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top gradient fade */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#070a10] to-transparent pointer-events-none z-10" />

      {/* Center content */}
      <div className="relative z-20 flex flex-col items-center justify-center flex-1 px-12 py-16 gap-10">
        {/* Headline */}
        <div className="text-center">
          <p className="text-white font-bold text-xl leading-relaxed whitespace-pre-line">
            {tagline}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === activeDot
                    ? "w-6 h-1.5 bg-[#135bec]"
                    : "w-1.5 h-1.5 bg-[#2a2f3e]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Live activity feed */}
        <div className="w-full max-w-xs">
          <LiveActivityFeed />
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#070a10] to-transparent pointer-events-none z-10" />

      {/* Stats cards */}
      <div className="relative z-20 px-8 pb-8 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#0d1117]/90 border border-[#1e2535] rounded-2xl px-4 py-3 backdrop-blur-md"
          >
            <p className="text-[#135bec] font-black text-xl leading-none">
              {stat.value}
            </p>
            <p className="text-[#3a4155] text-[10px] mt-1.5 uppercase tracking-widest font-semibold">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Security badge */}
      <div className="relative z-20 pb-4 flex items-center justify-center gap-2">
        <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3 text-[#2a3048]">
          <path
            d="M8 1L2 4v4c0 3.5 2.5 6.7 6 7.5C11.5 14.7 14 11.5 14 8V4L8 1z"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[#2a3048] text-[10px] font-medium uppercase tracking-widest">
          TLS 1.3 · SOC 2 Type II · ISO 27001
        </span>
      </div>
    </div>
  );
}
