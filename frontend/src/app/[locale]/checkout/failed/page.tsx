"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutFailedPage() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent_id") ?? "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-lg max-w-md w-full p-10 text-center space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <XCircle size={64} className="text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900">Pago fallido</h1>
        <p className="text-gray-600">
          Hubo un problema procesando tu pago. No se realizó ningún cargo.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Verificá los datos de tu tarjeta e intentá nuevamente. Si el problema persiste, contactá soporte.
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={agentId ? `../../app/marketplace/${agentId}` : "../../app/marketplace"}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            Intentar nuevamente
          </Link>
          <Link
            href="../../app/marketplace"
            className="w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            Volver al Marketplace
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
