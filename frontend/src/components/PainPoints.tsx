const STACK = [
  { icon: "▲", label: "Next.js" },
  { icon: "⚡", label: "Supabase" },
  { icon: "🔗", label: "n8n" },
  { icon: "🤖", label: "LangGraph" },
  { icon: "💳", label: "MercadoPago" },
  { icon: "📱", label: "WhatsApp API" },
  { icon: "🧠", label: "Claude API" },
  { icon: "🐘", label: "PostgreSQL" },
  { icon: "🐳", label: "Docker" },
  { icon: "🌐", label: "Vercel / Hetzner" },
];

export default function PainPoints() {
  const items = [...STACK, ...STACK];
  return (
    <div
      id="tech-ticker"
      className="bg-white border-y border-black/[0.08] py-8 overflow-hidden"
    >
      <div className="text-center text-[11px] font-bold uppercase tracking-widest text-[#6B7A8D] opacity-60 mb-5">
        Stack tecnológico que usamos
      </div>
      <div className="flex overflow-hidden">
        <div className="flex gap-12 whitespace-nowrap landing-ticker-track">
          {items.map((it, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-base font-semibold text-[#1A2B4A]"
            >
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
