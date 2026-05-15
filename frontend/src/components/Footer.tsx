import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="bg-[#0F1A2E] text-white/70 pt-15 pb-8"
      style={{ paddingTop: 60 }}
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-16 mb-12">
          <div className="flex flex-col gap-4">
            <div className="text-2xl font-black text-white">
              webshooks<span className="text-[#F97316]">.</span>
            </div>
            <div className="text-sm leading-relaxed max-w-[280px]">
              Transformamos negocios locales en operaciones digitales con IA.
              Presencia digital, automatización y agentes inteligentes en 14
              días.
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">
              Soluciones
            </h4>
            <ul className="flex flex-col gap-3 list-none">
              <li>
                <a
                  href="#solutions"
                  className="text-sm text-white/70 hover:text-[#4DB8E8] transition-colors"
                >
                  Presencia Digital
                </a>
              </li>
              <li>
                <a
                  href="#solutions"
                  className="text-sm text-white/70 hover:text-[#4DB8E8] transition-colors"
                >
                  Automatización
                </a>
              </li>
              <li>
                <a
                  href="#solutions"
                  className="text-sm text-white/70 hover:text-[#4DB8E8] transition-colors"
                >
                  Agentes IA
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">
              Empresa
            </h4>
            <ul className="flex flex-col gap-3 list-none">
              <li>
                <a
                  href="#stories"
                  className="text-sm text-white/70 hover:text-[#4DB8E8] transition-colors"
                >
                  Casos de éxito
                </a>
              </li>
              <li>
                <a
                  href="#tech-ticker"
                  className="text-sm text-white/70 hover:text-[#4DB8E8] transition-colors"
                >
                  Stack tecnológico
                </a>
              </li>
              <li>
                <a
                  href="#final-cta"
                  className="text-sm text-white/70 hover:text-[#4DB8E8] transition-colors"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">
              Legal
            </h4>
            <ul className="flex flex-col gap-3 list-none">
              <li>
                <Link
                  href="/es/privacy"
                  className="text-sm text-white/70 hover:text-[#4DB8E8] transition-colors"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link
                  href="/es/privacy"
                  className="text-sm text-white/70 hover:text-[#4DB8E8] transition-colors"
                >
                  Términos
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-[13px]">
          © 2026 webshooks. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
