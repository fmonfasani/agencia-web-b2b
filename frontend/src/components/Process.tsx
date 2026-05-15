const PORTFOLIO = [
  { name: "Luz Guffanti", url: "https://luzguffanti.com" },
  { name: "Mateo", url: "https://mateo.webshooks.com" },
  { name: "Valentino", url: "https://valentino.webshooks.com" },
  { name: "Joaquín", url: "https://joaquin.webshooks.com" },
];

const STORIES = [
  {
    initials: "LG",
    name: "Luz Guffanti · Personal Brand",
    quote:
      "Necesitaba una presencia digital profesional que reflejara mi marca personal. En dos semanas tenía mi sitio web, optimizado para SEO y recibiendo consultas orgánicas.",
    result: "3 consultas nuevas por día desde el primer mes",
    wide: true,
  },
  {
    initials: "B&B",
    name: "Bit&Byte",
    quote:
      "El agente de IA responde consultas técnicas las 24 horas. Liberó tiempo valioso de mi equipo.",
    result: "80% de consultas resueltas sin intervención",
    wide: false,
  },
  {
    initials: "QP",
    name: "Querida Pampa",
    quote:
      "Lanzamos nuestro marketplace de productos regionales en tiempo récord.",
    result: "Marketplace operativo en 10 días",
    wide: false,
  },
  {
    initials: "AM",
    name: "Ana Murat · Reiki",
    quote:
      "Antes perdía tiempo coordinando sesiones por WhatsApp. Ahora mis clientes reservan directamente y el sistema me confirma automáticamente.",
    result: "Reservas automatizadas 24/7",
    wide: true,
  },
];

export default function Process() {
  return (
    <>
      {/* Portfolio Marquee */}
      <div
        id="customers"
        className="bg-white border-t border-black/[0.08] py-16 overflow-hidden"
      >
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-20 mb-8">
          <div className="text-center text-[13px] font-semibold text-[#6B7A8D] opacity-70">
            Portfolio · Ellos ya dieron el salto digital con webshooks
          </div>
        </div>
        <div className="relative w-full overflow-hidden">
          <div
            className="flex gap-16 landing-ticker-track"
            style={{ width: "max-content" }}
          >
            {[...PORTFOLIO, ...PORTFOLIO, ...PORTFOLIO].map((site, i) => (
              <a
                key={i}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-8 py-4 text-2xl font-black text-[#9CA3AF] grayscale hover:grayscale-0 hover:text-[#1A2B4A] transition-all whitespace-nowrap shrink-0 group"
              >
                <span className="w-3 h-3 rounded-full bg-[#9CA3AF] group-hover:bg-[#4F46E5] transition-colors" />
                {site.name}
                <span className="text-sm font-medium text-[#9CA3AF] group-hover:text-[#4F46E5] transition-colors">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Stories */}
      <section id="stories" className="bg-[#D6EDF8] py-24 md:py-32">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-12">
            <div>
              <h2 className="mb-3">
                Historias de{" "}
                <em className="not-italic text-[#0F9AD4]">transformación</em>
              </h2>
              <p className="text-base text-[#6B7A8D] max-w-[560px]">
                Casos reales de negocios que digitalizaron sus operaciones con
                webshooks
              </p>
            </div>
            <div className="flex gap-3">
              <button
                aria-label="Anterior"
                className="w-12 h-12 rounded-full border-2 border-black/[0.08] bg-white flex items-center justify-center text-xl text-[#1A2B4A] hover:border-[#0F9AD4] hover:bg-[#0F9AD4] hover:text-white transition-all"
              >
                ←
              </button>
              <button
                aria-label="Siguiente"
                className="w-12 h-12 rounded-full border-2 border-black/[0.08] bg-white flex items-center justify-center text-xl text-[#1A2B4A] hover:border-[#0F9AD4] hover:bg-[#0F9AD4] hover:text-white transition-all"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STORIES.map((s) => (
              <article
                key={s.initials}
                className={`bg-white border border-black/[0.08] rounded-2xl p-10 flex flex-col gap-5 transition-all hover:border-[#0F9AD4] hover:shadow-[0_8px_24px_rgba(15,154,212,0.12)] hover:-translate-y-0.5 cursor-pointer ${s.wide ? "md:col-span-2" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#EAF6FC] flex items-center justify-center text-xl font-black text-[#0F9AD4]">
                    {s.initials}
                  </div>
                  <div className="text-lg font-bold text-[#1A2B4A]">
                    {s.name}
                  </div>
                </div>
                <div className="text-base italic text-[#6B7A8D] leading-relaxed">
                  &ldquo;{s.quote}&rdquo;
                </div>
                <div className="flex items-center gap-2 text-2xl font-black text-[#0F9AD4] mt-auto">
                  <span className="text-xl">↑</span>
                  <span className="text-base font-bold">{s.result}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
