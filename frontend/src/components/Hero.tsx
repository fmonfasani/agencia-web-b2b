/* eslint-disable @next/next/no-img-element */
export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden py-20 md:py-32">
      {/* Curved cyan-tinted background bleeding from the left */}
      <div
        className="absolute top-0 left-0 h-full w-[68%] bg-[#D6EDF8] z-0"
        style={{ borderRadius: "0 60% 60% 0 / 0 50% 50% 0" }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-20">
        <div className="grid lg:grid-cols-[480px_1fr] gap-12 lg:gap-20 items-center">
          {/* Left: Mosaic */}
          <div className="grid grid-cols-[55%_45%] gap-2 w-full max-w-[480px] mx-auto lg:mx-0 lg:-translate-y-12">
            {/* Row 1 */}
            <div className="rounded-xl overflow-hidden h-[140px] md:h-[180px]">
              <div className="bg-[#0F9AD4] h-full p-6 flex flex-col justify-center text-white">
                <div className="text-3xl md:text-4xl font-bold leading-none mb-2">
                  80%
                </div>
                <div className="text-sm text-white/90">automatización</div>
              </div>
            </div>
            <a
              href="https://luzguffanti.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl overflow-hidden h-[140px] md:h-[180px] block transition-transform hover:scale-[1.02]"
            >
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop&auto=format"
                alt="Equipo trabajando"
                className="w-full h-full object-cover"
              />
            </a>
            {/* Row 2 */}
            <a
              href="https://valentino.webshooks.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl overflow-hidden h-[140px] md:h-[180px] block transition-transform hover:scale-[1.02]"
            >
              <img
                src="https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=300&fit=crop&auto=format"
                alt="Zapatería"
                className="w-full h-full object-cover"
              />
            </a>
            <div className="rounded-xl overflow-hidden h-[140px] md:h-[180px]">
              <div className="bg-[#EA4C19] h-full p-6 flex flex-col justify-center text-white">
                <div className="text-3xl md:text-4xl font-bold leading-none mb-2">
                  14
                </div>
                <div className="text-sm text-white/90">días de entrega</div>
              </div>
            </div>
            {/* Row 3 */}
            <div className="rounded-xl overflow-hidden h-[140px] md:h-[180px]">
              <div className="bg-[#5DC85D] h-full p-6 flex flex-col justify-center text-white">
                <div className="text-3xl md:text-4xl font-bold leading-none mb-2">
                  5+
                </div>
                <div className="text-sm text-white/90">demos en vivo</div>
              </div>
            </div>
            <a
              href="https://joaquin.webshooks.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl overflow-hidden h-[140px] md:h-[180px] block transition-transform hover:scale-[1.02]"
            >
              <img
                src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop&auto=format"
                alt="Tech workspace"
                className="w-full h-full object-cover"
              />
            </a>
          </div>

          {/* Right: Copy */}
          <div className="flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 bg-white border border-black/[0.08] px-4 py-2 rounded-3xl text-[13px] font-medium text-[#6B7A8D] w-fit">
              <span className="w-2 h-2 bg-[#0F9AD4] rounded-full animate-pulse" />
              <span>Transformación digital · LATAM · IA</span>
            </div>

            <h1 className="leading-[1.15]">
              Iniciá tu{" "}
              <span className="text-[#0F9AD4] block">
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
                className="inline-block bg-[#0F9AD4] hover:bg-[#4DB8E8] text-white px-6 py-3 rounded-lg text-[15px] font-semibold transition-all hover:-translate-y-0.5"
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
