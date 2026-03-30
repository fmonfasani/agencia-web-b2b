import { LoginForm } from "@/components/auth/LoginForm";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import Image from "next/image";
import Link from "next/link";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === "en";

  const t = {
    heading: en ? "Welcome back" : "Bienvenido de vuelta",
    sub: en ? "Don't have an account?" : "¿No tenés cuenta?",
    signUp: en ? "Sign up" : "Registrá tu empresa",
    google: en ? "Sign in with Google" : "Continuar con Google",
    or: "or",
    badge: en
      ? "Protected by Webshooks IAM · TLS 1.3"
      : "Protegido por Webshooks IAM · TLS 1.3",
    tagline: en
      ? "Your sales pipeline, humans and AI,\nall in one place."
      : "Tu pipeline de ventas, humanos e IA,\ntodo en un solo lugar.",
    stats: en
      ? [
          { label: "Active companies", value: "2,400+" },
          { label: "MRR generated", value: "$1.2M" },
          { label: "AI agents", value: "12K+" },
        ]
      : [
          { label: "Empresas activas", value: "2,400+" },
          { label: "MRR generado", value: "$1.2M" },
          { label: "Agentes IA", value: "12K+" },
        ],
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] flex">
      {/* ── LEFT — Form Card ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#135bec] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4 h-4 text-white"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-white font-bold text-base tracking-tight">
              Webshooks
            </span>
          </div>

          <h1 className="text-[2rem] font-black text-white leading-tight">
            {t.heading}
          </h1>
          <p className="text-[#8b92a5] mt-1.5 text-sm">
            {t.sub}{" "}
            <Link
              href={`/${locale}/auth/register-company`}
              className="text-[#135bec] font-semibold hover:text-blue-400 transition-colors"
            >
              {t.signUp}
            </Link>
          </p>

          <div className="mt-8 space-y-4">
            {/* Google OAuth */}
            <GoogleSignInButton label={t.google} />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#2a2f3e]" />
              <span className="text-[#4a5168] text-xs font-medium">{t.or}</span>
              <div className="flex-1 h-px bg-[#2a2f3e]" />
            </div>

            <LoginForm darkMode locale={locale} />
          </div>

          <p className="mt-8 text-center text-[10px] text-[#3a4055] font-medium uppercase tracking-widest">
            {t.badge}
          </p>
        </div>
      </div>

      {/* ── RIGHT — Illustration ── */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden bg-[#0a0d13]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#135bec]/8 rounded-full blur-[140px] pointer-events-none" />

        <div className="absolute inset-0 z-0">
          <Image
            src="/signin-hero.png"
            alt="Webshooks AI Agent"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13] via-[#0a0d13]/40 to-transparent" />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#0a0d13] via-transparent to-transparent"
            style={{ width: "30%" }}
          />
        </div>

        <div className="relative z-10 mt-auto mb-40 text-center px-12">
          <p className="text-[#8b92a5] text-sm leading-relaxed whitespace-pre-line">
            {t.tagline}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`rounded-full ${i === 0 ? "w-6 h-1.5 bg-[#135bec]" : "w-1.5 h-1.5 bg-[#2a2f3e]"}`}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-8 right-8 z-10 grid grid-cols-3 gap-3">
          {t.stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[#161923] border border-[#2a2f3e] rounded-2xl px-4 py-3"
            >
              <p className="text-[#135bec] font-black text-lg leading-none">
                {stat.value}
              </p>
              <p className="text-[#4a5168] text-[10px] mt-1 uppercase tracking-widest font-semibold">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
