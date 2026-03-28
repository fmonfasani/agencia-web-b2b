"use client";

import { useState, use } from "react";
import {
    Rocket,
    Target,
    Cpu,
    CheckCircle2,
    ArrowRight,
    Settings2,
    Sparkles,
    Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
    {
        id: "config",
        title: "Configuración Inicial",
        description: "Personalizá tu instancia de Webshooks.",
        icon: Settings2,
    },
    {
        id: "objective",
        title: "Objetivo de Ventas",
        description: "¿A quién queremos venderle hoy?",
        icon: Target,
    },
    {
        id: "ai-intro",
        title: "Tu Ejército de IA",
        description: "Cómo operan tus nuevos agentes.",
        icon: Cpu,
    }
];

export default function OnboardingPage({ params: paramsPromise }: { params: Promise<{ locale: string }> }) {
    const params = use(paramsPromise);
    const { locale } = params;
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Data State
    const [formData, setFormData] = useState({
        instanceName: "",
        industry: "",
        targetRegion: "",
        dailyGoal: "10",
    });

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/${params.locale}/api/admin/onboarding`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instanceName: formData.instanceName,
                    industry: formData.industry,
                    targetRegion: formData.targetRegion,
                    dailyGoal: formData.dailyGoal,
                }),
            });

            if (!response.ok) throw new Error("Error saving onboarding");

            router.push(`/${params.locale}/admin/dashboard`);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0d0f14] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#135bec]/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-2xl w-full z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-2.5 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-[#135bec] flex items-center justify-center shadow-lg shadow-[#135bec]/30">
                            <Rocket className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Webshooks</span>
                    </div>

                    <h1 className="text-4xl font-black mb-3">
                        ¡Bienvenido a bordo, <span className="text-[#135bec]">Comandante</span>!
                    </h1>
                    <p className="text-[#8b92a5] text-lg">
                        Estamos preparando tu entorno táctico. Unos pocos clics y estarás operando.
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-10">
                    {STEPS.map((step, idx) => (
                        <div
                            key={step.id}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${idx <= currentStep ? "bg-[#135bec]" : "bg-[#2a2f3e]"}`}
                        />
                    ))}
                </div>

                {/* Dynamic Content */}
                <div className="bg-[#161923] border border-[#2a2f3e] rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-8"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#135bec]/10 flex items-center justify-center border border-[#135bec]/20">
                                    {(() => {
                                        const Icon = STEPS[currentStep].icon;
                                        return <Icon className="w-6 h-6 text-[#135bec]" />;
                                    })()}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">{STEPS[currentStep].title}</h2>
                                    <p className="text-[#8b92a5]">{STEPS[currentStep].description}</p>
                                </div>
                            </div>

                            {/* Step Content */}
                            {currentStep === 0 && (
                                <div className="space-y-6 py-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#4a5168] uppercase tracking-widest">Nombre de la Instancia</label>
                                        <input
                                            type="text"
                                            value={formData.instanceName}
                                            onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
                                            placeholder="Revenue Instance #01"
                                            className="w-full bg-[#0d0f14] border border-[#2a2f3e] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#135bec]/50 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#135bec]/5 border border-[#135bec]/10">
                                        <Sparkles className="w-5 h-5 text-[#135bec]" />
                                        <p className="text-sm text-[#8b92a5]">Tu dominio táctico estará listo en <code>instance.webshooks.ai</code></p>
                                    </div>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                    {["SaaS & Software", "Real Estate", "Professional Services", "E-commerce"].map((ind) => (
                                        <button
                                            key={ind}
                                            onClick={() => setFormData({ ...formData, industry: ind })}
                                            className={`p-5 rounded-2xl border transition-all text-left group ${formData.industry === ind ? "bg-[#135bec] border-[#135bec]" : "bg-[#0d0f14] border-[#2a2f3e] hover:border-[#4a5168]"}`}
                                        >
                                            <h3 className="font-bold mb-1">{ind}</h3>
                                            <p className={`text-xs ${formData.industry === ind ? "text-blue-100" : "text-[#4a5168]"}`}>Configuración optimizada</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-6 py-4 text-center">
                                    <div className="w-20 h-20 rounded-full bg-[#135bec]/10 flex items-center justify-center mx-auto mb-6">
                                        <Zap className="w-10 h-10 text-[#135bec] animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-bold">Tus agentes están despertando</h3>
                                    <p className="text-[#8b92a5] max-w-sm mx-auto">
                                        Al finalizar, activaremos tu primer <strong>Business Agent</strong> que empezará a buscar leads de <code>{formData.industry || "General"}</code> inmediatamente.
                                    </p>
                                </div>
                            )}

                            {/* Action */}
                            <button
                                onClick={nextStep}
                                disabled={loading}
                                className="w-full bg-[#135bec] hover:bg-[#0e45b5] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-[#135bec]/25 transition-all flex items-center justify-center gap-3 group"
                            >
                                {loading ? "Desplegando..." : currentStep === STEPS.length - 1 ? "Comenzar Operaciones" : "Siguiente Paso"}
                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Security Badge */}
                <p className="mt-10 text-center text-[10px] text-[#3a4055] font-medium uppercase tracking-widest flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-3 h-3" />
                    Data Isolation Active · Tenant Encryption Verified
                </p>
            </div>
        </div>
    );
}
