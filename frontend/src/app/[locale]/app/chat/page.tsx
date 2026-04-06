"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { executeAgent } from "@/app/actions/agent";
import { PageTransition } from "@/components/animations/PageTransition";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  iterationCount?: number;
  duration?: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "¡Hola! Soy tu agente IA especializado. ¿En qué puedo ayudarte hoy?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    setError(null);

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const userQuery = input;
    setInput("");
    setIsLoading(true);

    try {
      // Llamar al Server Action para ejecutar el agente
      const response = await executeAgent(userQuery);

      if (response.success && response.data) {
        const result = response.data;
        // Extraer el contenido de la respuesta del agente
        const content = Array.isArray(result.result)
          ? result.result
              .filter((msg: any) => msg.role === "assistant")
              .map((msg: any) => msg.content)
              .join("\n")
          : result.result;

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: content || "No se obtuvo respuesta del agente",
          timestamp: new Date(),
          iterationCount: result.iterations || 0,
          duration: result.total_duration_ms || 0,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setError(response.error || "Error al ejecutar el agente");
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-4 flex flex-col h-screen max-h-screen">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl font-bold text-gray-900">Chat con tu Agente IA</h1>
          <p className="text-gray-600">
            Consulta directamente con tu agente especializado
          </p>
        </motion.div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Messages Container */}
      <motion.div
        className="flex-1 bg-white border border-gray-200 rounded-lg p-6 overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
                initial={{ opacity: 0, x: message.role === "user" ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
              <div
                className={`max-w-md px-4 py-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-900 rounded-bl-none"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                {message.role === "assistant" && message.iterationCount && (
                  <p className="text-xs mt-2 opacity-75">
                    ⚙️ {message.iterationCount} iteraciones • ⏱️{" "}
                    {message.duration}ms
                  </p>
                )}
                <p
                  className={`text-xs mt-1 ${
                    message.role === "user"
                      ? "text-blue-100"
                      : "text-gray-500"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg rounded-bl-none">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      </motion.div>

      {/* Input Area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escribe tu consulta aquí..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Send size={18} />
          Enviar
        </button>
      </div>
      </div>
    </PageTransition>
  );
}
