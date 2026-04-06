import { LoginForm } from "@/components/auth/LoginForm";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import AuthRightPanel from "@/components/auth/AuthRightPanel";
import Link from "next/link";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === "en";

  const stats = en
    ? [
        { label: "Active companies", value: "2,400+" },
        { label: "MRR generated", value: "$1.2M" },
        { label: "AI agents", value: "12K+" },
      ]
    : [
        { label: "Empresas activas", value: "2,400+" },
        { label: "MRR generado", value: "$1.2M" },
        { label: "Agentes IA", value: "12K+" },
      ];

  const tagline = en
    ? "Your sales pipeline,\nhumans and AI together."
    : "Tu pipeline de ventas.\nHumanos e IA, un solo lugar.";

  return (
    <div className="min-h-screen bg-black flex">
      {/* ── LEFT — Form ── */}
      <div className="w-full lg:w-[480px] flex items-center justify-center px-8 py-12 overflow-y-auto border-r border-white/[0.04]">
        <div className="w-full max-w-[360px]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4 h-4 text-black"
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
            <span className="text-white font-semibold text-sm tracking-tight">
              Webshooks
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-white leading-tight tracking-tight mb-1">
            {en ? "Sign in" : "Iniciá sesión"}
          </h1>
          <p className="text-white/40 text-sm mb-8">
            {en ? "No account? " : "¿Sin cuenta? "}
            <Link
              href={`/${locale}/auth/register-company`}
              className="text-white/70 hover:text-white transition-colors underline underline-offset-2"
            >
              {en ? "Create one" : "Creá una"}
            </Link>
          </p>

          <div className="space-y-3">
            <GoogleSignInButton
              label={en ? "Continue with Google" : "Continuar con Google"}
            />

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-white/20 text-xs">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <LoginForm locale={locale} darkMode />
          </div>

          <div className="mt-10 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="w-3 h-3 text-white/20"
              >
                <path
                  d="M8 1L2 4v4c0 3.5 2.5 6.7 6 7.5C11.5 14.7 14 11.5 14 8V4L8 1z"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-white/20 text-[10px] font-medium uppercase tracking-widest">
                TLS 1.3
              </span>
            </div>
            <span className="text-white/10 text-xs">·</span>
            <span className="text-white/20 text-[10px] font-medium uppercase tracking-widest">
              SOC 2
            </span>
            <span className="text-white/10 text-xs">·</span>
            <span className="text-white/20 text-[10px] font-medium uppercase tracking-widest">
              ISO 27001
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Neural Grid + Live Feed ── */}
      <AuthRightPanel tagline={tagline} stats={stats} activeDot={0} />
    </div>
  );
}
