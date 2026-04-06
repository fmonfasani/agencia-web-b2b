"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, CheckCircle, Lock, CreditCard } from "lucide-react";
import { getMarketplaceAgent } from "@/app/actions/marketplace";
import { initiateCheckout } from "@/app/actions/billing";
import { useToast } from "@/hooks/useToast";
import type { MarketplaceAgent } from "@/app/actions/marketplace";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();

  const agentId = searchParams.get("agent_id") ?? "";
  const [agent, setAgent] = useState<MarketplaceAgent | null>(null);
  const [plan, setPlan] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    getMarketplaceAgent(agentId).then((a) => {
      setAgent(a);
      setLoading(false);
    });
  }, [agentId]);

  const price = agent ? (plan === "annual" ? agent.price * 10 : agent.price) : 0;

  const handleCheckout = async () => {
    if (!agent) return;
    setProcessing(true);
    try {
      const result = await initiateCheckout(agentId, plan, agent.name, agent.price);
      if (result.success && result.data) {
        // In production: window.location.href = result.data.checkoutUrl (Stripe redirect)
        router.push(`checkout/success?session_id=${result.data.sessionId}&agent=${encodeURIComponent(agent.name)}`);
      } else {
        addToast(result.error ?? "Error al procesar pago", "error");
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Agente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShoppingCart size={24} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-500 text-sm">Completa tu compra de forma segura</p>
        </div>

        {/* Agent summary */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Producto</p>
          <p className="font-bold text-gray-900">{agent.name}</p>
          <p className="text-sm text-gray-500">{agent.category}</p>
        </div>

        {/* Plan selector */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Seleccionar plan</p>
          {[
            { value: "monthly" as const, label: "Mensual", price: agent.price, note: "Cancela cuando quieras" },
            { value: "annual" as const, label: "Anual", price: agent.price * 10, note: "2 meses gratis 🎉" },
          ].map((p) => (
            <label
              key={p.value}
              className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                plan === p.value ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  value={p.value}
                  checked={plan === p.value}
                  onChange={() => setPlan(p.value)}
                  className="text-blue-600"
                />
                <div>
                  <p className="font-semibold text-gray-900">{p.label}</p>
                  <p className="text-xs text-gray-500">{p.note}</p>
                </div>
              </div>
              <p className="font-bold text-blue-600">${p.price}</p>
            </label>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Subtotal</span>
            <span>${price}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-lg">
            <span>Total</span>
            <span>${price}</span>
          </div>
        </div>

        {/* Payment method placeholder */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center gap-3">
          <CreditCard size={20} className="text-gray-400" />
          <p className="text-sm text-gray-500">Pago seguro via Stripe — redirigirá al checkout</p>
        </div>

        {/* CTA */}
        <button
          onClick={handleCheckout}
          disabled={processing}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Lock size={18} />
          {processing ? "Procesando..." : `Pagar $${price}`}
        </button>

        <p className="text-xs text-center text-gray-400">
          Pago 100% seguro · Cancela en cualquier momento
        </p>
      </motion.div>
    </div>
  );
}
