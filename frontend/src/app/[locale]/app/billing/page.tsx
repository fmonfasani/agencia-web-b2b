"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Download, AlertCircle, CheckCircle } from "lucide-react";
import { PageTransition, StaggerItem } from "@/components/animations/PageTransition";
import { useToast } from "@/components/ui/toast";

interface Subscription {
  id: string;
  agentName: string;
  plan: string;
  amount: number;
  currency: string;
  status: "active" | "canceled" | "past_due";
  nextBillingDate: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  agentName: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
}

const mockSubscriptions: Subscription[] = [
  {
    id: "sub_recepcion",
    agentName: "Recepción IA Pro",
    plan: "Mensual",
    amount: 99,
    currency: "USD",
    status: "active",
    nextBillingDate: "2026-05-06",
    createdAt: "2026-03-06",
  },
  {
    id: "sub_ventas",
    agentName: "Ventas IA Enterprise",
    plan: "Anual",
    amount: 1290,
    currency: "USD",
    status: "active",
    nextBillingDate: "2027-04-06",
    createdAt: "2026-04-06",
  },
];

const mockInvoices: Invoice[] = [
  {
    id: "inv_001",
    invoiceNumber: "INV-2026-001",
    date: "2026-04-06",
    agentName: "Recepción IA Pro",
    amount: 99,
    currency: "USD",
    status: "paid",
  },
  {
    id: "inv_002",
    invoiceNumber: "INV-2026-002",
    date: "2026-04-06",
    agentName: "Ventas IA Enterprise",
    amount: 1290,
    currency: "USD",
    status: "paid",
  },
  {
    id: "inv_003",
    invoiceNumber: "INV-2026-003",
    date: "2026-03-06",
    agentName: "Recepción IA Pro",
    amount: 99,
    currency: "USD",
    status: "paid",
  },
];

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(mockSubscriptions);
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const totalMRR = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.plan === "Mensual" ? s.amount : 0), 0);

  const totalARR = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.plan === "Anual" ? s.amount : 0), 0);

  const handleCancelSubscription = async (subscriptionId: string) => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === subscriptionId ? { ...s, status: "canceled" as const } : s
        )
      );
      addToast("Suscripción cancelada exitosamente", "success");
    } catch (error) {
      addToast("Error al cancelar la suscripción", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    addToast(`Descargando factura ${invoice.invoiceNumber}...`, "info");
    // Mock download
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <StaggerItem>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Facturación
            </h1>
            <p className="text-gray-600">
              Gestiona tus suscripciones y facturas
            </p>
          </div>
        </StaggerItem>

        {/* MRR & ARR Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              MRR (Recurrente Mensual)
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              ${totalMRR.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {subscriptions.filter((s) => s.status === "active" && s.plan === "Mensual").length} suscripción
              {subscriptions.filter((s) => s.status === "active" && s.plan === "Mensual").length !== 1 ? "es" : ""} activa
              {subscriptions.filter((s) => s.status === "active" && s.plan === "Mensual").length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              ARR (Recurrente Anual)
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              ${totalARR.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {subscriptions.filter((s) => s.status === "active" && s.plan === "Anual").length} suscripción
              {subscriptions.filter((s) => s.status === "active" && s.plan === "Anual").length !== 1 ? "es" : ""} activa
              {subscriptions.filter((s) => s.status === "active" && s.plan === "Anual").length !== 1 ? "s" : ""}
            </p>
          </div>
        </motion.div>

        {/* Subscriptions Section */}
        <StaggerItem>
          <motion.div
            className="border border-gray-200 rounded-lg p-6 bg-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Suscripciones Activas</h2>
            </div>

            <div className="space-y-4">
              {subscriptions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay suscripciones activas
                </p>
              ) : (
                subscriptions.map((sub, idx) => (
                  <motion.div
                    key={sub.id}
                    className="border border-gray-100 rounded-lg p-4 flex items-between justify-between"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{sub.agentName}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                        <div>
                          <p className="text-xs text-gray-500">Plan</p>
                          <p>{sub.plan}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Precio</p>
                          <p>
                            ${sub.amount}/{sub.plan === "Mensual" ? "mes" : "año"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Siguiente facturación</p>
                          <p>{new Date(sub.nextBillingDate).toLocaleDateString("es-ES")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Estado</p>
                          <div className="flex items-center gap-1">
                            {sub.status === "active" ? (
                              <>
                                <CheckCircle size={14} className="text-green-600" />
                                <span className="text-green-600">Activo</span>
                              </>
                            ) : sub.status === "past_due" ? (
                              <>
                                <AlertCircle size={14} className="text-yellow-600" />
                                <span className="text-yellow-600">Vencido</span>
                              </>
                            ) : (
                              <span className="text-red-600">Cancelado</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {sub.status === "active" && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleCancelSubscription(sub.id)}
                          disabled={loading}
                          className="px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </StaggerItem>

        {/* Invoices Section */}
        <StaggerItem>
          <motion.div
            className="border border-gray-200 rounded-lg p-6 bg-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">Facturas Recientes</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Factura
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Agente
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Fecha
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Monto
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Estado
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, idx) => (
                    <motion.tr
                      key={invoice.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {invoice.agentName}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(invoice.date).toLocaleDateString("es-ES")}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        ${invoice.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            invoice.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : invoice.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {invoice.status === "paid"
                            ? "Pagada"
                            : invoice.status === "pending"
                              ? "Pendiente"
                              : "Fallida"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Download size={14} />
                          Descargar
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </StaggerItem>
      </div>
    </PageTransition>
  );
}
