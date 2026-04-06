import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import AuthRightPanel from "@/components/auth/AuthRightPanel";
import SignupWizard from "@/components/auth/SignupWizard";
import Link from "next/link";

export default async function RegisterCompanyPage({
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
    ? "Scale your agency with\nhumans and AI in one pipeline."
    : "Escalá tu agencia con humanos e IA\ntrabajando en el mismo pipeline.";

  return (
    <div className="min-h-screen bg-[#070a10] flex">
      {/* ── LEFT — Form ── */}
      <div className="w-full lg:w-1/2 flex items-start justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-[460px]">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-[#135bec] flex items-center justify-center shadow-lg shadow-[#135bec]/30">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4.5 h-4.5 text-white"
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

          <h1 className="text-[2rem] font-black text-white leading-tight tracking-tight">
            {en ? "Create your company" : "Registrá tu empresa"}
          </h1>
          <p className="text-[#4a5168] mt-2 text-sm mb-8">
            {en ? "Already have an account? " : "¿Ya tenés cuenta? "}
            <Link
              href={`/${locale}/auth/sign-in`}
              className="text-[#135bec] font-semibold hover:text-blue-400 transition-colors"
            >
              {en ? "Sign in" : "Iniciá sesión"}
            </Link>
          </p>

          {/* Google OAuth */}
          <div className="space-y-4 mb-6">
            <GoogleSignInButton
              label={en ? "Sign up with Google" : "Registrate con Google"}
            />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#1e2535]" />
              <span className="text-[#2a3048] text-xs font-medium">o</span>
              <div className="flex-1 h-px bg-[#1e2535]" />
            </div>
          </div>

          <SignupWizard locale={locale} />

          {/* Security badges */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="w-3.5 h-3.5 text-[#2a3048]"
              >
                <path
                  d="M8 1L2 4v4c0 3.5 2.5 6.7 6 7.5C11.5 14.7 14 11.5 14 8V4L8 1z"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[#2a3048] text-[10px] font-medium uppercase tracking-widest">
                TLS 1.3
              </span>
            </div>
            <div className="w-px h-3 bg-[#1e2535]" />
            <span className="text-[#2a3048] text-[10px] font-medium uppercase tracking-widest">
              SOC 2
            </span>
            <div className="w-px h-3 bg-[#1e2535]" />
            <span className="text-[#2a3048] text-[10px] font-medium uppercase tracking-widest">
              ISO 27001
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Neural Grid + Live Feed ── */}
      <AuthRightPanel tagline={tagline} stats={stats} activeDot={1} />
    </div>
  );
}
