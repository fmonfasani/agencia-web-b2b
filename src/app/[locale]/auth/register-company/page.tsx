import CompanySignUpForm from "@/components/auth/CompanySignUpForm";
import { Rocket } from "lucide-react";

export default function RegisterCompanyPage() {
    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-amber-400 to-primary/50"></div>

            <div className="w-full max-w-md relative">
                <div className="mb-8 text-center">
                    <div className="size-14 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Rocket size={28} className="text-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Comienza tu Escalamiento
                    </h1>
                    <h2 className="text-primary font-bold text-sm uppercase tracking-tighter mt-1">Multi-Tenant Experience</h2>
                    <p className="text-slate-500 mt-2 font-medium">
                        Registra tu empresa y despliega tu instancia privada de Revenue OS en segundos.
                    </p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100">
                    <CompanySignUpForm />
                </div>

                <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Ready for CRM, CMS & Observability
                </p>
                <p className="mt-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Secured by Lead Intel Hub IAM
                </p>
            </div>
        </div>
    );
}
