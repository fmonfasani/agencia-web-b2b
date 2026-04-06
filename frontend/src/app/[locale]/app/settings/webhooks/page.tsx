"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Webhook,
} from "lucide-react";
import {
  PageTransition,
  StaggerItem,
} from "@/components/animations/PageTransition";
import { useToast } from "@/hooks/useToast";
import {
  getWebhooks,
  createWebhook,
  testWebhook,
  deleteWebhook,
  getWebhookLogs,
  Webhook as WebhookType,
  WebhookLog,
  WebhookEvent,
} from "@/app/actions/webhooks";

const ALL_WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "agent.query.executed", label: "Query ejecutada" },
  { value: "agent.status.changed", label: "Estado del agente cambia" },
  { value: "subscription.created", label: "Suscripción creada" },
  { value: "subscription.cancelled", label: "Suscripción cancelada" },
  { value: "payment.failed", label: "Pago fallido" },
  { value: "usage.threshold_exceeded", label: "Límite de uso superado" },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [logs, setLogs] = useState<Record<string, WebhookLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const { addToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    url: "",
    events: [] as WebhookEvent[],
  });

  useEffect(() => {
    getWebhooks().then((data) => {
      setWebhooks(data);
      setLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    const res = await createWebhook(form.name, form.url, form.events);
    if (res.success && res.data) {
      setWebhooks((prev) => [res.data!, ...prev]);
      setShowForm(false);
      setForm({ name: "", url: "", events: [] });
      addToast("Webhook creado", "success");
    } else {
      addToast(res.error ?? "Error al crear webhook", "error");
    }
  };

  const handleTest = async (whId: string) => {
    setTesting(whId);
    const res = await testWebhook(whId);
    if (res.success) {
      addToast(
        `Webhook testeado — ${res.latency}ms — ${res.response}`,
        "success",
      );
    } else {
      addToast(res.error ?? "Test fallido", "error");
    }
    setTesting(null);
  };

  const handleDelete = async (whId: string) => {
    if (!confirm("¿Eliminar este webhook?")) return;
    const res = await deleteWebhook(whId);
    if (res.success) {
      setWebhooks((prev) => prev.filter((w) => w.id !== whId));
      addToast("Webhook eliminado", "success");
    }
  };

  const handleViewLogs = async (whId: string) => {
    if (expandedLogs === whId) {
      setExpandedLogs(null);
      return;
    }
    if (!logs[whId]) {
      const data = await getWebhookLogs(whId);
      setLogs((prev) => ({ ...prev, [whId]: data }));
    }
    setExpandedLogs(whId);
  };

  const toggleEvent = (event: WebhookEvent) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Webhooks
              </h1>
              <p className="text-gray-600">
                Recibe notificaciones automáticas en tu sistema
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              Nuevo Webhook
            </button>
          </div>
        </StaggerItem>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="border border-blue-200 bg-blue-50 rounded-lg p-5 space-y-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="font-bold text-gray-900">Crear Webhook</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Alertas Producción"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL (HTTPS)
                  </label>
                  <input
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://api.tuservicio.com/webhook"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eventos
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {ALL_WEBHOOK_EVENTS.map((ev) => (
                    <label
                      key={ev.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.events.includes(ev.value)}
                        onChange={() => toggleEvent(ev.value)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{ev.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={!form.name || !form.url || form.events.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50"
                >
                  Crear
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Webhooks list */}
        <div className="space-y-4">
          {loading ? (
            [...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 rounded-lg animate-pulse"
              />
            ))
          ) : webhooks.length === 0 ? (
            <div className="border border-gray-200 rounded-lg p-12 text-center">
              <Webhook size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay webhooks configurados</p>
            </div>
          ) : (
            webhooks.map((wh, i) => (
              <motion.div
                key={wh.id}
                className="border border-gray-200 rounded-lg bg-white overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{wh.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${wh.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {wh.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-gray-500 mb-2 break-all">
                      {wh.url}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map((ev) => (
                        <span
                          key={ev}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>✓ {wh.successCount} exitosos</span>
                      <span>✗ {wh.failCount} fallidos</span>
                      {wh.lastFiredAt && (
                        <span>
                          Último:{" "}
                          {new Date(wh.lastFiredAt).toLocaleDateString("es-AR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleViewLogs(wh.id)}
                      className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                    >
                      Logs
                    </button>
                    <button
                      onClick={() => handleTest(wh.id)}
                      disabled={testing === wh.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50"
                    >
                      <Play size={12} />
                      {testing === wh.id ? "..." : "Test"}
                    </button>
                    <button
                      onClick={() => handleDelete(wh.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Logs panel */}
                <AnimatePresence>
                  {expandedLogs === wh.id && logs[wh.id] && (
                    <motion.div
                      className="border-t border-gray-100 bg-gray-50"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <div className="p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-3">
                          Últimos disparos
                        </p>
                        <div className="space-y-2">
                          {logs[wh.id].map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center gap-3 text-xs"
                            >
                              {log.status === "success" ? (
                                <CheckCircle
                                  size={14}
                                  className="text-green-600"
                                />
                              ) : (
                                <XCircle size={14} className="text-red-500" />
                              )}
                              <span className="text-gray-600">{log.event}</span>
                              <span className="text-gray-400">
                                {log.statusCode}
                              </span>
                              <span className="text-gray-400">
                                {log.duration}ms
                              </span>
                              <span className="text-gray-400 ml-auto">
                                {new Date(log.timestamp).toLocaleString(
                                  "es-AR",
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}
