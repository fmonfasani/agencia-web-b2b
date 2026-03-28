import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-10">
      <div className="max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>
        <p className="text-slate-600 mb-8">
          Estamos actualizando nuestros términos legales para brindarte la mejor
          protección.
        </p>
        <Link
          href="/"
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
