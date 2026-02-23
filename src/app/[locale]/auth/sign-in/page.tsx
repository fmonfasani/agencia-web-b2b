import LoginForm from "@/components/auth/LoginForm";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Acceso admin</h1>
        <p className="text-slate-500 mt-1 mb-6">
          Inicia sesión para gestionar tus leads y configuración.
        </p>
        <LoginForm />
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Internal access restricted to authorized personnel.
          </p>
        </div>
      </div>
    </div>
  );
}
