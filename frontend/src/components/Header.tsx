import Link from "next/link";

export default function Header() {
  return (
    <nav className="bg-white border-b border-black/[0.08] py-5 sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-20 flex items-center justify-between">
        <div className="text-2xl font-black text-[#1A2B4A] tracking-tight">
          webshooks
        </div>
        <ul className="hidden md:flex items-center gap-8 list-none">
          <li>
            <a
              href="#solutions"
              className="text-[15px] font-medium text-[#6B7A8D] hover:text-[#0F9AD4] transition-colors"
            >
              Soluciones
            </a>
          </li>
          <li>
            <a
              href="#stories"
              className="text-[15px] font-medium text-[#6B7A8D] hover:text-[#0F9AD4] transition-colors"
            >
              Casos de éxito
            </a>
          </li>
          <li>
            <Link
              href="/es/auth/sign-in"
              className="text-[15px] font-medium text-[#6B7A8D] hover:text-[#0F9AD4] transition-colors"
            >
              Iniciar sesión
            </Link>
          </li>
          <li>
            <a
              href="#final-cta"
              className="inline-block bg-[#0F9AD4] hover:bg-[#4DB8E8] text-white px-6 py-3 rounded-lg text-[15px] font-semibold transition-all hover:-translate-y-0.5"
            >
              Agendar cita gratuita
            </a>
          </li>
        </ul>
        <div className="md:hidden flex items-center gap-3">
          <Link
            href="/es/auth/sign-in"
            className="text-sm font-medium text-[#6B7A8D] hover:text-[#0F9AD4] transition-colors"
          >
            Login
          </Link>
          <a
            href="#final-cta"
            className="inline-block bg-[#0F9AD4] text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Agendar
          </a>
        </div>
      </div>
    </nav>
  );
}
