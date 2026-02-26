import CompanySignUpForm from "@/components/auth/CompanySignUpForm";
import Image from "next/image";
import { Zap } from "lucide-react";

export default function RegisterCompanyPage() {
    return (
        <div className="min-h-screen bg-[#0f1117] flex">

            {/* ── LEFT — Hero Illustration ── */}
            <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden px-12">
                {/* Glowing blob */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#f5e642]/10 rounded-full blur-[120px] pointer-events-none" />

                {/* Brand badge */}
                <div className="absolute top-8 left-8 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#f5e642] flex items-center justify-center">
                        <Zap size={16} className="text-[#0f1117] fill-[#0f1117]" />
                    </div>
                    <span className="text-white font-black text-sm tracking-tight">Revenue OS</span>
                </div>

                {/* Illustration */}
                <div className="relative z-10 w-full max-w-md">
                    <Image
                        src="/signup-hero.png"
                        alt="Revenue OS Dashboard Illustration"
                        width={560}
                        height={560}
                        className="object-contain drop-shadow-2xl"
                        priority
                    />
                </div>

                {/* Quote */}
                <div className="relative z-10 mt-6 max-w-xs text-center">
                    <p className="text-white/60 text-sm leading-relaxed font-medium">
                        Escala tus ventas con humanos e IA trabajando juntos en el mismo pipeline.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-1.5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#f5e642]" />
                        ))}
                    </div>
                </div>

                {/* Stat pills */}
                <div className="absolute bottom-10 left-8 right-8 flex gap-3">
                    {[
                        { label: "Empresas activas", value: "2,400+" },
                        { label: "MRR generado", value: "$1.2M" },
                        { label: "Agentes IA", value: "12K+" },
                    ].map((stat) => (
                        <div key={stat.label} className="flex-1 bg-white/5 border border-white/10 backdrop-blur rounded-2xl px-4 py-3">
                            <p className="text-[#f5e642] font-black text-lg leading-none">{stat.value}</p>
                            <p className="text-white/40 text-[10px] mt-1 uppercase tracking-widest font-bold">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── RIGHT — Form ── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 overflow-y-auto">
                <div className="w-full max-w-md">

                    {/* Logo mobile */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-8 h-8 rounded-full bg-[#f5e642] flex items-center justify-center">
                            <Zap size={16} className="text-[#0f1117] fill-[#0f1117]" />
                        </div>
                        <span className="text-white font-black text-sm tracking-tight">Revenue OS</span>
                    </div>

                    <h1 className="text-3xl font-black text-white tracking-tight">
                        Registrá tu empresa
                    </h1>
                    <p className="text-white/50 mt-2 text-sm font-medium">
                        Creá tu instancia privada de Revenue OS en 30 segundos.{" "}
                        <a href="#" className="text-[#f5e642] hover:underline font-semibold">
                            ¿Ya tenés cuenta?
                        </a>
                    </p>

                    {/* Form card */}
                    <div className="mt-8 bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-8">
                        <CompanySignUpFormDark />
                    </div>

                    <p className="mt-6 text-center text-[10px] text-white/20 font-bold uppercase tracking-widest">
                        Protegido por Revenue OS IAM · TLS 1.3
                    </p>
                </div>
            </div>
        </div>
    );
}

// Dark-theme wrapper that re-uses the form logic
function CompanySignUpFormDark() {
    return <CompanySignUpForm darkMode />;
}
