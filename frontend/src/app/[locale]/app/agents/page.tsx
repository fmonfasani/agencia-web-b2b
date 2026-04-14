"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Plus,
  X,
  ChevronRight,
  Cpu,
  MessageSquare,
  HeadphonesIcon,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  saasClientFor,
  type AgentTemplate,
  type AgentInstance,
} from "@/lib/saas-client";
import { AgentCard } from "@/components/dashboard/AgentCard";
import {
  PageTransition,
  StaggerItem,
} from "@/components/animations/PageTransition";

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  recepcionista: MessageSquare,
  ventas: Cpu,
  soporte: HeadphonesIcon,
  informativo: Info,
};

const TEMPLATE_COLORS: Record<string, string> = {
  recepcionista: "from-blue-50 to-indigo-100 text-blue-600",
  ventas: "from-green-50 to-emerald-100 text-green-600",
  soporte: "from-orange-50 to-amber-100 text-orange-600",
  informativo: "from-purple-50 to-violet-100 text-purple-600",
};

export default function AgentsPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "es";
  const router = useRouter();
  const { data: session } = useSession();

  const [instances, setInstances] = useState<AgentInstance[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [creating, setCreating] = useState<string | null>(null); // template_id being created

  const apiKey = (session?.user as any)?.apiKey as string | undefined;

  useEffect(() => {
    if (!apiKey) return;
    const client = saasClientFor(apiKey);

    Promise.allSettled([
      client.instances.list({ status: "active" }),
      client.templates.list(),
    ])
      .then(([instRes, tplRes]) => {
        if (instRes.status === "fulfilled") setInstances(instRes.value ?? []);
        if (tplRes.status === "fulfilled") setTemplates(tplRes.value ?? []);
      })
      .finally(() => setLoading(false));
  }, [apiKey]);

  const handleCreate = async (template: AgentTemplate) => {
    if (!apiKey || creating) return;
    setCreating(template.id);
    try {
      const client = saasClientFor(apiKey);
      const inst = await client.instances.create({
        template_id: template.id,
        name: template.name,
        custom_prompt: "",
        overrides: {},
      });
      setInstances((prev) => [inst, ...prev]);
      setShowPicker(false);
      router.push(`/${locale}/app/agents/${inst.id}`);
    } catch (e) {
      console.error("[create instance]", e);
    } finally {
      setCreating(null);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <StaggerItem>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Mis Agentes
              </h1>
              <p className="text-gray-600">
                Monitorea y gestiona tus agentes IA
              </p>
            </div>
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={18} />
              Nuevo Agente
            </button>
          </div>
        </StaggerItem>

        {/* Agent instances grid */}
        <StaggerItem>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-72 bg-gray-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : instances.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-16 text-center">
              <Bot size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Aún no tenés agentes
              </h3>
              <p className="text-gray-500 mb-6">
                Creá tu primer agente desde una plantilla
              </p>
              <button
                onClick={() => setShowPicker(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Crear agente
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instances.map((inst) => (
                <Link
                  key={inst.id}
                  href={`/${locale}/app/agents/${inst.id}`}
                  className="block hover:no-underline"
                >
                  <AgentCard
                    id={inst.id}
                    name={inst.name}
                    type={
                      inst.template_name ?? inst.template_type ?? "Agente IA"
                    }
                    status={inst.status === "active" ? "online" : "offline"}
                    queries={0}
                    latency={0}
                    errorRate={0}
                  />
                </Link>
              ))}
            </div>
          )}
        </StaggerItem>

        {/* Template picker modal */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) =>
                e.target === e.currentTarget && setShowPicker(false)
              }
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Elegí una plantilla
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      El agente se configura con el prompt base de la plantilla.
                      Podés personalizarlo después.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPicker(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Templates grid */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.length === 0 ? (
                    <p className="col-span-2 text-center text-gray-500 py-8">
                      Cargando plantillas...
                    </p>
                  ) : (
                    templates.map((tpl) => {
                      const Icon = TEMPLATE_ICONS[tpl.type] ?? Bot;
                      const colorClass =
                        TEMPLATE_COLORS[tpl.type] ??
                        "from-gray-50 to-gray-100 text-gray-600";
                      const isCreating = creating === tpl.id;
                      return (
                        <motion.button
                          key={tpl.id}
                          onClick={() => handleCreate(tpl)}
                          disabled={!!creating}
                          className="text-left p-5 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group disabled:opacity-50"
                          whileHover={{ y: -2 }}
                        >
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center mb-3`}
                          >
                            {isCreating ? (
                              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Icon size={22} />
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">
                              {tpl.name}
                            </h3>
                            <ChevronRight
                              size={16}
                              className="text-gray-300 group-hover:text-blue-500 transition-colors"
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {tpl.description}
                          </p>
                          <div className="mt-3 flex gap-1 flex-wrap">
                            {tpl.tools.map((tool) => (
                              <span
                                key={tool}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </motion.button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
