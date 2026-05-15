export default function Qualification() {
  return (
    <section id="final-cta" className="bg-[#1A2B4A] text-white py-24 md:py-32">
      <div className="max-w-[960px] mx-auto px-6 sm:px-10 text-center">
        <h2 className="text-white mb-10">
          ¿Listo para tu{" "}
          <em className="not-italic text-[#4DB8E8]">transformación digital</em>?
        </h2>

        <div className="bg-[#162444] border-2 border-[#2A3D6A] rounded-2xl p-8 md:p-12 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-12 items-center text-left">
          <div className="bg-[#0F9AD4] rounded-2xl p-8 text-center">
            <div className="text-6xl md:text-7xl font-black leading-none tracking-tighter">
              15
            </div>
            <div className="text-base md:text-lg font-semibold mt-2 opacity-95">
              minutos
            </div>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-white mb-3">Diagnóstico gratuito</h3>
            <p className="text-base text-white/80 mb-6 leading-relaxed">
              En 15 minutos te armamos un roadmap personalizado con presupuesto
              y tiempos. Sin compromiso, sin vueltas.
            </p>
            <a
              href="https://calendly.com/webshooks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white text-[#1A2B4A] px-8 py-3.5 rounded-lg font-bold text-base hover:bg-[#4DB8E8] hover:text-white hover:-translate-y-0.5 transition-all"
            >
              Agendar cita gratuita →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
