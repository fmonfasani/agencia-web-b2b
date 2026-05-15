/* eslint-disable @next/next/no-img-element */

type Card =
  | { kind: "stat"; gradient: string; stat: string; label: string }
  | { kind: "photo"; src: string; alt: string; href: string };

const COLUMN_LEFT: Card[] = [
  {
    kind: "stat",
    gradient: "linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%)",
    stat: "100%",
    label: "personalizado",
  },
  {
    kind: "photo",
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=480&h=360&fit=crop&auto=format",
    alt: "Equipo trabajando",
    href: "https://luzguffanti.com",
  },
  {
    kind: "stat",
    gradient: "linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)",
    stat: "5+",
    label: "demos en vivo",
  },
  {
    kind: "photo",
    src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=480&h=360&fit=crop&auto=format",
    alt: "Oficina",
    href: "https://joaquin.webshooks.com",
  },
];

const COLUMN_RIGHT: Card[] = [
  {
    kind: "photo",
    src: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=480&h=360&fit=crop&auto=format",
    alt: "Workspace moderno",
    href: "https://valentino.webshooks.com",
  },
  {
    kind: "stat",
    gradient: "linear-gradient(135deg, #ffa726 0%, #ff9800 100%)",
    stat: "14",
    label: "días",
  },
  {
    kind: "photo",
    src: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=480&h=360&fit=crop&auto=format",
    alt: "Equipo creativo",
    href: "https://mateo.webshooks.com",
  },
  {
    kind: "stat",
    gradient: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
    stat: "80%",
    label: "automatización",
  },
];

function CardItem({ card }: { card: Card }) {
  if (card.kind === "stat") {
    return (
      <div
        className="rounded-2xl overflow-hidden flex flex-col justify-center items-center text-center text-white p-8 h-[200px]"
        style={{ background: card.gradient }}
      >
        <div className="text-[56px] font-bold leading-none mb-2">
          {card.stat}
        </div>
        <div className="text-base font-medium opacity-95">{card.label}</div>
      </div>
    );
  }
  return (
    <a
      href={card.href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-2xl overflow-hidden block transition-transform hover:scale-[1.02] h-[200px]"
    >
      <img
        src={card.src}
        alt={card.alt}
        className="w-full h-full object-cover"
      />
    </a>
  );
}

function BounceColumn({
  cards,
  direction,
}: {
  cards: Card[];
  direction: "up" | "down";
}) {
  const animClass =
    direction === "up" ? "landing-bounce-up" : "landing-bounce-down";
  return (
    <div className="relative h-[580px] overflow-hidden">
      <div className={`flex flex-col gap-4 ${animClass}`}>
        {cards.map((card, i) => (
          <CardItem key={i} card={card} />
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-[calc(100vh-80px)] flex items-center gap-10 lg:gap-20 px-6 sm:px-10 lg:px-16 py-16 lg:py-20 overflow-hidden"
    >
      {/* Background shape: cyan gradient with rounded bottom-right corner */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-full lg:w-[60%] z-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #d4ecf8 0%, #b8dff0 100%)",
          borderRadius: "0 0 40% 0",
        }}
      >
        <div
          className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] rounded-full"
          style={{ background: "rgba(255, 255, 255, 0.3)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
        {/* Two bouncing columns: left starts up, right starts down */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-[480px] shrink-0">
          <BounceColumn cards={COLUMN_LEFT} direction="up" />
          <BounceColumn cards={COLUMN_RIGHT} direction="down" />
        </div>

        {/* Hero content */}
        <div className="relative flex-1 max-w-[680px]">
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-3xl text-sm text-[#6b7280] mb-6"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "#F97316" }}
            />
            Transformación digital · LATAM · IA
          </div>

          <h1
            className="font-bold text-[#1a1a2e] mb-6"
            style={{
              fontSize: "clamp(42px, 5.5vw, 68px)",
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
            }}
          >
            Iniciá tu
            <br />
            <span style={{ color: "#F97316" }}>transformación digital</span>
            <br />
            con nosotros.
          </h1>

          <p className="text-lg leading-[1.7] text-[#6b7280] mb-10 max-w-[580px]">
            Llevamos tu negocio al mundo digital: presencia online,
            automatización de procesos y agentes de IA que trabajan por vos.
            Todo en 14 días.
          </p>

          <div className="flex flex-wrap items-center gap-5">
            <a
              href="#final-cta"
              className="inline-block bg-[#F97316] hover:bg-[#EA580C] text-white px-9 py-[18px] rounded-xl text-base font-semibold transition-all hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(249,115,22,0.3)] hover:shadow-[0_12px_32px_rgba(249,115,22,0.4)]"
            >
              Agendar cita gratuita
            </a>
            <a
              href="#solutions"
              className="inline-flex items-center gap-2 text-base font-semibold text-[#1a1a2e] hover:gap-3 transition-all"
            >
              Ver demos reales <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
