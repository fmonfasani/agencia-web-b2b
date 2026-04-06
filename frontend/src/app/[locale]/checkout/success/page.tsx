"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const agentName = searchParams.get("agent") ?? "tu agente";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-lg max-w-md w-full p-10 text-center space-y-5"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 260 }}
        >
          <CheckCircle size={64} className="text-green-500 mx-auto" />
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-900">¡Pago exitoso!</h1>
        <p className="text-gray-600">
          <strong>{decodeURIComponent(agentName)}</strong> ha sido activado en tu cuenta.
          Ya podés empezar a usar tu agente IA.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
          Recibirás un email de confirmación con los detalles de tu suscripción.
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="../../app"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            Ir al Dashboard
          </Link>
          <Link
            href="../../app/agents"
            className="w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            Ver mis agentes
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
