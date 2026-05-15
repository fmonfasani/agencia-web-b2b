export default function Services() {
  return (
    <section id="solutions" className="bg-[#D6EDF8] py-24 md:py-32">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-20">
        <div className="text-center mb-16">
          <h2 className="mb-4">
            Tres capas de{" "}
            <em className="not-italic text-[#0F9AD4]">transformación</em>
          </h2>
          <p className="text-lg text-[#6B7A8D] max-w-[640px] mx-auto">
            Presencia digital, automatización inteligente y agentes de IA que
            trabajan 24/7 por tu negocio
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 auto-rows-[1fr]">
          {/* Card 1: Presencia Digital (wide cyan) */}
          <article className="md:col-span-2 rounded-2xl p-10 border border-black/[0.08] flex flex-col gap-5 transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,154,212,0.18)] text-white bg-gradient-to-br from-[#0F9AD4] to-[#0882BC]">
            <div>
              <div className="text-[28px] font-black tracking-tight">
                Presencia Digital
              </div>
              <div className="text-[15px] opacity-90 mt-1">
                Web profesional, SEO optimizado y analytics en tiempo real
              </div>
            </div>
            <div className="text-[64px] font-black leading-none tracking-tighter">
              3x
            </div>
            <div className="text-[15px] opacity-90">
              más consultas en el primer mes
            </div>
            <div className="flex gap-2 flex-wrap mt-auto">
              {["Next.js", "SEO", "Analytics", "CMS"].map((t) => (
                <span
                  key={t}
                  className="bg-white/15 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                >
                  {t}
                </span>
              ))}
            </div>
          </article>

          {/* Card 2: Meet CTA (purple) */}
          <article className="rounded-2xl p-10 border border-black/[0.08] flex flex-col gap-5 transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(99,102,241,0.18)] text-white bg-gradient-to-br from-[#818CF8] to-[#6366F1]">
            <div className="text-[28px] font-black tracking-tight">
              ¿Listo para la transformación digital?
            </div>
            <div className="border-2 border-white/30 rounded-2xl p-6 text-center my-2">
              <div className="text-5xl font-black leading-none tracking-tight">
                15
              </div>
              <div className="text-sm opacity-90 mt-2">MIN</div>
            </div>
            <div className="text-[15px] opacity-90">
              Diagnóstico gratuito · Roadmap + presupuesto sin compromiso
            </div>
            <a
              href="#final-cta"
              className="mt-auto inline-block bg-white text-[#1A2B4A] px-8 py-3.5 rounded-lg font-bold text-base hover:bg-[#4DB8E8] hover:text-white hover:-translate-y-0.5 transition-all w-fit"
            >
              Agendar cita gratuita →
            </a>
          </article>

          {/* Card 3: Automatización (dark) */}
          <article className="rounded-2xl p-10 border border-black/[0.08] flex flex-col gap-5 transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.18)] text-white bg-[#1A2B4A]">
            <div className="text-[28px] font-black tracking-tight">
              Automatización
            </div>
            <div className="text-[15px] opacity-90">
              Workflows que trabajan por vos mientras dormís
            </div>
            <div className="flex items-center gap-3 my-3 flex-wrap">
              <span className="bg-white/15 px-4 py-2.5 rounded-3xl text-sm font-semibold">
                trigger
              </span>
              <span className="text-xl opacity-50">→</span>
              <span className="bg-white/15 px-4 py-2.5 rounded-3xl text-sm font-semibold">
                n8n
              </span>
              <span className="text-xl opacity-50">→</span>
              <span className="bg-white/15 px-4 py-2.5 rounded-3xl text-sm font-semibold">
                done ✓
              </span>
            </div>
            <div className="flex gap-2 flex-wrap mt-auto">
              {["n8n", "WhatsApp API", "CRM"].map((t) => (
                <span
                  key={t}
                  className="bg-white/15 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                >
                  {t}
                </span>
              ))}
            </div>
          </article>

          {/* Card 4: Soluciones IA (wide orange split) */}
          <article className="md:col-span-2 rounded-2xl p-10 border border-black/[0.08] flex flex-col gap-5 transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(234,76,25,0.18)] text-white bg-gradient-to-br from-[#EA4C19] to-[#C93E15]">
            <div className="grid md:grid-cols-2 gap-8 h-full">
              <div className="flex flex-col">
                <div className="text-[28px] font-black tracking-tight">
                  Soluciones IA
                </div>
                <div className="text-[15px] opacity-90 mt-1">
                  Potenciadas por inteligencia artificial
                </div>
                <div className="text-[64px] font-black leading-none tracking-tighter mt-8">
                  100%
                </div>
                <div className="text-[15px] opacity-90 mt-2">
                  Personalizado a tu industria
                </div>
                <div className="flex gap-2 flex-wrap mt-auto pt-4">
                  {["Claude API", "RAG", "LangGraph"].map((t) => (
                    <span
                      key={t}
                      className="bg-white/15 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-[15px] opacity-90 mb-4">
                  Implementación de Agentes con RAG
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="bg-white/15 px-4 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2.5">
                    🏪 Retail y e-commerce
                  </div>
                  <div className="bg-white/15 px-4 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2.5">
                    🏥 Salud y bienestar
                  </div>
                  <div className="bg-white/15 px-4 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2.5">
                    💼 Servicios B2B
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Card 5: Agentes RAG (sky) */}
          <article className="rounded-2xl p-10 border border-black/[0.08] flex flex-col gap-5 transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(56,189,248,0.18)] text-white bg-gradient-to-br from-[#4DB8E8] to-[#38BDF8]">
            <div className="text-[28px] font-black tracking-tight">
              Agentes con RAG
            </div>
            <div className="text-[15px] opacity-90">
              Responden consultas con tu información
            </div>
            <div className="bg-white/15 rounded-xl p-4 mt-2">
              <div className="bg-white/20 px-3.5 py-2.5 rounded-2xl text-[13px] mb-2 max-w-[80%] rounded-bl-sm">
                ¿Tienen envío a Córdoba?
              </div>
              <div className="bg-white/30 px-3.5 py-2.5 rounded-2xl text-[13px] ml-auto max-w-[80%] rounded-br-sm">
                Sí, enviamos a todo el país. A Córdoba llega en 3-5 días hábiles
                📦
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mt-auto">
              {["Vector DB", "Embeddings"].map((t) => (
                <span
                  key={t}
                  className="bg-white/15 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                >
                  {t}
                </span>
              ))}
            </div>
          </article>

          {/* Card 6: Resultados (white) */}
          <article className="rounded-2xl p-10 border border-black/[0.08] bg-white flex flex-col gap-5 transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,154,212,0.12)]">
            <div className="text-[28px] font-black tracking-tight text-[#1A2B4A]">
              Resultados medibles
            </div>
            <div className="text-[15px] text-[#6B7A8D]">
              Métricas reales de nuestros clientes
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-[#F2F9FD] p-5 rounded-xl border border-black/[0.08]">
                <div className="text-3xl font-black tracking-tighter text-[#0F9AD4]">
                  +320%
                </div>
                <div className="text-[13px] text-[#6B7A8D] mt-1">
                  tráfico web
                </div>
              </div>
              <div className="bg-[#F2F9FD] p-5 rounded-xl border border-black/[0.08]">
                <div className="text-3xl font-black tracking-tighter text-[#F5A623]">
                  80%
                </div>
                <div className="text-[13px] text-[#6B7A8D] mt-1">
                  automatizado
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
