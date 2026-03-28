import SignUpForm from "@/components/auth/SignUpForm";
import { ShieldCheck } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-amber-400 to-primary/50"></div>

      <div className="w-full max-w-md relative">
        <div className="mb-8 text-center">
          <div className="size-14 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Crea tu Identidad
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Configura tu acceso seguro al Webshooks de tu organización.
          </p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100">
          <SignUpForm />
        </div>

        <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Secured by Lead Intel Hub IAM
        </p>
      </div>
    </div>
  );
}
