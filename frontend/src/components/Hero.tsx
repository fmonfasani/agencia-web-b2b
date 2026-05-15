/* eslint-disable @next/next/no-img-element */

type Card =
  | {
      kind: "stat";
      bg: string;
      stat: string;
      label: string;
    }
  | {
      kind: "photo";
      src: string;
      alt: string;
      href: string;
    };

const COLUMN_A: Card[] = [
  {
    kind: "stat",
    bg: "bg-gradient-to-br from-[#4F46E5] to-[#0F9AD4]",
    stat: "80%",
    label: "automatización",
  },
  {
    kind: "photo",
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=480&h=360&fit=crop&auto=format",
    alt: "Equipo trabajando",
    href: "https://luzguffanti.com",
  },
  {
    kind: "stat",
    bg: "bg-gradient-to-br from-[#5DC85D] to-[#2E8B57]",
    stat: "5+",
    label: "demos en vivo",
  },
  {
    kind: "photo",
    src: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=480&h=360&fit=crop&auto=format",
    alt: "Workspace tech",
    href: "https://joaquin.webshooks.com",
  },
];

const COLUMN_B: Card[] = [
  {
    kind: "photo",
    src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=480&h=360&fit=crop&auto=format",
    alt: "Reunión cliente",
    href: "https://valentino.webshooks.com",
  },
  {
    kind: "stat",
    bg: "bg-gradient-to-br from-[#F59E0B] to-[#EA4C19]",
    stat: "14",
    label: "días de entrega",
  },
  {
    kind: "photo",
    src: "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=480&h=360&fit=crop&auto=format",
    alt: "Producto premium",
    href: "https://mateo.webshooks.com",
  },
  {
    kind: "stat",
    bg: "bg-gradient-to-br from-[#0F9AD4] to-[#4DB8E8]",
    stat: "100%",
    label: "personalizado",
  },
];

function CardItem({ card }: { card: Card }) {
  if (card.kind === "stat") {
    return (
      <div
        className={`rounded-2xl h-[200px] p-6 flex flex-col justify-end text-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${card.bg}`}
      >
        <div className="text-4xl md:text-5xl font-black leading-none mb-2 tracking-tight">
          {card.stat}
        </div>
        <div className="text-base text-white/95">{card.label}</div>
      </div>
    );
  }
  return (
    <a
      href={card.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl h-[200px] overflow-hidden shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-transform hover:scale-[1.02]"
    >
      <img
        src={card.src}
        alt={card.alt}
        className="w-full h-full object-cover"
      />
    </a>
  );
}

function MarqueeColumn({
  cards,
  direction,
}: {
  cards: Card[];
  direction: "up" | "down";
}) {
  const animClass =
    direction === "up" ? "landing-marquee-up" : "landing-marquee-down";
  return (
    <div className="relative h-[560px] overflow-hidden landing-marquee-mask">
      <div className={`flex flex-col gap-4 ${animClass}`}>
        {[...cards, ...cards].map((card, i) => (
          <CardItem key={i} card={card} />
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden py-20 md:py-28">
      {/* Curved cyan-tinted background bleeding from the left */}
      <div
        className="absolute top-0 left-0 h-full w-[68%] bg-[#D6EDF8] z-0"
        style={{ borderRadius: "0 60% 60% 0 / 0 50% 50% 0" }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-20">
        <div className="grid lg:grid-cols-[480px_1fr] gap-12 lg:gap-20 items-center">
          {/* Left: vertical marquee mosaic */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-[480px] mx-auto lg:mx-0">
            <MarqueeColumn cards={COLUMN_A} direction="up" />
            <MarqueeColumn cards={COLUMN_B} direction="down" />
          </div>

          {/* Right: Copy */}
          <div className="flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 bg-white border border-black/[0.08] px-4 py-2 rounded-3xl text-[13px] font-medium text-[#6B7A8D] w-fit">
              <span className="w-2 h-2 bg-[#4F46E5] rounded-full animate-pulse" />
              <span>Transformación digital · LATAM · IA</span>
            </div>

            <h1 className="leading-[1.15]">
              Iniciá tu{" "}
              <span className="text-[#4F46E5] block">
                transformación digital
              </span>{" "}
              con nosotros.
            </h1>

            <p className="text-base text-[#6B7A8D] max-w-[480px] leading-relaxed">
              Llevamos tu negocio al mundo digital: presencia online,
              automatización de procesos y agentes de IA que trabajan por vos.
              Todo en 14 días.
            </p>

            <div className="flex flex-wrap gap-4 mt-2">
              <a
                href="#final-cta"
                className="inline-block bg-[#4F46E5] hover:bg-[#6366F1] text-white px-6 py-3 rounded-lg text-[15px] font-semibold transition-all hover:-translate-y-0.5"
              >
                Agendar cita gratuita
              </a>
              <a
                href="#solutions"
                className="inline-block text-[#1A2B4A] px-6 py-3 text-[15px] font-semibold hover:opacity-70 transition-opacity"
              >
                Ver demos reales →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
