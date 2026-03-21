import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Recuperar Contraseña</h1>
        <p className="text-slate-400">
          Esta funcionalidad estará disponible pronto.
        </p>
        <Link href="/" className="text-blue-500 hover:underline mt-4 block">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
