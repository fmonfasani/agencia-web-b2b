"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Eye, EyeOff, Trash2, Plus, CheckCircle } from "lucide-react";
import { PageTransition, StaggerItem } from "@/components/animations/PageTransition";
import { useToast } from "@/components/ui/toast";

interface APIKey {
  id: string;
  name: string;
  key: string;
  maskedKey: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

const mockAPIKeys: APIKey[] = [
  {
    id: "key_1",
    name: "Production Key",
    key: "wh_prod_XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    maskedKey: "wh_prod_***...***XXXX",
    createdAt: "2026-02-15",
    lastUsedAt: "2026-04-06",
    isActive: true,
  },
  {
    id: "key_2",
    name: "Development Key",
    key: "wh_dev_YYYYYYYYYYYYYYYYYYYYYYYYYY",
    maskedKey: "wh_dev_***...***YYYY",
    createdAt: "2026-03-01",
    lastUsedAt: "2026-04-05",
    isActive: true,
  },
];

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>(mockAPIKeys);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    addToast(`API key "${keyName}" copiada al portapapeles`, "success");
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      addToast("Por favor, ingresa un nombre para la nueva API key", "error");
      return;
    }

    setLoading(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newKey: APIKey = {
        id: `key_${Date.now()}`,
        name: newKeyName,
        key: `wh_prod_${Math.random().toString(36).substring(2, 28).toUpperCase()}`,
        maskedKey: `wh_prod_***...***${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        createdAt: new Date().toISOString().split("T")[0],
        isActive: true,
      };

      setApiKeys((prev) => [newKey, ...prev]);
      setNewKeyName("");
      setShowNewKeyForm(false);
      addToast(`API key "${newKeyName}" creada exitosamente`, "success");
    } catch (error) {
      addToast("Error al crear la API key", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta API key?")) {
      return;
    }

    setLoading(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      addToast("API key eliminada exitosamente", "success");
    } catch (error) {
      addToast("Error al eliminar la API key", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <StaggerItem>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Configuración
            </h1>
            <p className="text-gray-600">
              Gestiona tu cuenta y credenciales de API
            </p>
          </div>
        </StaggerItem>

        {/* API Keys Section */}
        <StaggerItem>
          <motion.div
            className="border border-gray-200 rounded-lg p-6 bg-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                Claves de API
              </h2>
              <button
                onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Nueva Clave
              </button>
            </div>

            {/* New Key Form */}
            {showNewKeyForm && (
              <motion.div
                className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Clave
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Ej: Production Key, Development Key..."
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleCreateKey();
                      }
                    }}
                  />
                  <button
                    onClick={handleCreateKey}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Crear
                  </button>
                </div>
              </motion.div>
            )}

            {/* API Keys List */}
            <div className="space-y-4">
              {apiKeys.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay claves de API creadas aún
                </p>
              ) : (
                apiKeys.map((apiKey, idx) => (
                  <motion.div
                    key={apiKey.id}
                    className="border border-gray-200 rounded-lg p-4 flex items-between justify-between"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {apiKey.name}
                        </h3>
                        {apiKey.isActive && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                            <CheckCircle size={12} className="text-green-600" />
                            <span className="text-xs text-green-700">Activa</span>
                          </div>
                        )}
                      </div>

                      {/* API Key Display */}
                      <div className="flex items-center gap-2 mb-3 p-3 bg-gray-50 rounded-lg font-mono text-sm">
                        <span className="text-gray-700 flex-1">
                          {visibleKeys.has(apiKey.id) ? apiKey.key : apiKey.maskedKey}
                        </span>
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          title={visibleKeys.has(apiKey.id) ? "Ocultar" : "Mostrar"}
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.key, apiKey.name)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          title="Copiar al portapapeles"
                        >
                          <Copy size={16} />
                        </button>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="text-xs text-gray-500">Creada el</p>
                          <p>{new Date(apiKey.createdAt).toLocaleDateString("es-ES")}</p>
                        </div>
                        {apiKey.lastUsedAt && (
                          <div>
                            <p className="text-xs text-gray-500">Último uso</p>
                            <p>{new Date(apiKey.lastUsedAt).toLocaleDateString("es-ES")}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <div className="flex items-center ml-4">
                      <button
                        onClick={() => handleDeleteKey(apiKey.id)}
                        disabled={loading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar clave"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </StaggerItem>

        {/* Account Information */}
        <StaggerItem>
          <motion.div
            className="border border-gray-200 rounded-lg p-6 bg-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-6">
              Información de Cuenta
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Empresa
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  Webshooks Inc.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  admin@webshooks.com
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  Professional
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Próximo Ciclo de Facturación
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {new Date("2026-05-06").toLocaleDateString("es-ES")}
                </div>
              </div>
            </div>
          </motion.div>
        </StaggerItem>

        {/* Danger Zone */}
        <StaggerItem>
          <motion.div
            className="border border-red-200 rounded-lg p-6 bg-red-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="text-lg font-bold text-red-900 mb-3">
              Zona de Riesgo
            </h2>
            <p className="text-sm text-red-800 mb-4">
              Estas acciones no se pueden deshacer. Por favor, procede con precaución.
            </p>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Eliminar Cuenta
            </button>
          </motion.div>
        </StaggerItem>
      </div>
    </PageTransition>
  );
}
