import LoginForm from "@/components/auth/LoginForm";
import Image from "next/image";
import Link from "next/link";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-[#0d0f14] flex">

      {/* ── LEFT — Form Card ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-[420px]">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#135bec] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-white font-bold text-base tracking-tight">Revenue OS</span>
          </div>

          {/* Heading */}
          <h1 className="text-[2rem] font-black text-white leading-tight">
            Welcome back
          </h1>
          <p className="text-[#8b92a5] mt-1.5 text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href={`/${locale}/auth/register-company`}
              className="text-[#135bec] font-semibold hover:text-blue-400 transition-colors"
            >
              Sign up
            </Link>
          </p>

          <div className="mt-8 space-y-4">
            {/* Social Login */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#2a2f3e] bg-[#161923] text-white text-sm font-medium hover:bg-[#1e2435] hover:border-[#3a4055] transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#2a2f3e] bg-[#161923] text-white text-sm font-medium hover:bg-[#1e2435] hover:border-[#3a4055] transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.58C5.337 19.6 4.002 17.02 4.002 14.57c0-4.56 3.07-6.97 6.1-6.97 1.573 0 2.886.9 3.88.9.943 0 2.414-.97 4.14-.97.59 0 2.516.25 3.81 1.99l.04.05z" />
              </svg>
              Sign in with Apple
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#2a2f3e]" />
              <span className="text-[#4a5168] text-xs font-medium">or</span>
              <div className="flex-1 h-px bg-[#2a2f3e]" />
            </div>

            {/* Email + Password form */}
            <LoginForm darkMode locale={locale} />
          </div>

          <p className="mt-8 text-center text-[10px] text-[#3a4055] font-medium uppercase tracking-widest">
            Protected by Revenue OS IAM · TLS 1.3
          </p>
        </div>
      </div>

      {/* ── RIGHT — Illustration ── */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden bg-[#0a0d13]">
        {/* Subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#135bec]/8 rounded-full blur-[140px] pointer-events-none" />

        {/* Illustration */}
        <div className="relative z-10 w-full max-w-lg px-8">
          <Image
            src="/signin-hero.png"
            alt="Revenue OS Dashboard"
            width={600}
            height={600}
            className="object-contain w-full"
            priority
          />
        </div>

        {/* Tagline */}
        <div className="relative z-10 mt-4 text-center px-12">
          <p className="text-[#8b92a5] text-sm leading-relaxed">
            Tu pipeline de ventas, humanos e IA,<br />todo en un solo lugar.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${i === 0 ? "w-6 h-1.5 bg-[#135bec]" : "w-1.5 h-1.5 bg-[#2a2f3e]"}`}
              />
            ))}
          </div>
        </div>

        {/* Stat pills */}
        <div className="absolute bottom-8 left-8 right-8 grid grid-cols-3 gap-3">
          {[
            { label: "Empresas activas", value: "2,400+" },
            { label: "MRR generado", value: "$1.2M" },
            { label: "Agentes IA", value: "12K+" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#161923] border border-[#2a2f3e] rounded-2xl px-4 py-3">
              <p className="text-[#135bec] font-black text-lg leading-none">{stat.value}</p>
              <p className="text-[#4a5168] text-[10px] mt-1 uppercase tracking-widest font-semibold">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
