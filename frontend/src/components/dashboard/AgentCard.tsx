"use client";

import { motion } from "framer-motion";
import { Bot, Cog, MoreVertical } from "lucide-react";
import Image from "next/image";

interface AgentCardProps {
  id: string;
  name: string;
  type: string;
  image?: string;
  status: "online" | "offline" | "degraded";
  queries: number;
  latency: number;
  errorRate: number;
  onConfig?: () => void;
  onMore?: () => void;
}

const statusColors = {
  online: "text-green-600 bg-green-50",
  offline: "text-red-600 bg-red-50",
  degraded: "text-yellow-600 bg-yellow-50",
};

const statusDots = {
  online: "🟢",
  offline: "🔴",
  degraded: "🟡",
};

export function AgentCard({
  id,
  name,
  type,
  image,
  status,
  queries,
  latency,
  errorRate,
  onConfig,
  onMore,
}: AgentCardProps) {
  return (
    <motion.div
      className="border border-gray-200 rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
    >
      {/* Image Container */}
      <div className="relative h-48 bg-gray-100 overflow-hidden group">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover group-hover:opacity-75 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <Bot size={48} className="text-blue-400" />
          </div>
        )}
        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
          <button className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-blue-600 text-white rounded font-medium transition-opacity hover:bg-blue-700">
            Ver detalles
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900">{name}</h3>
        <p className="text-sm text-gray-600 mb-3">{type}</p>

        {/* Status */}
        <div
          className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${statusColors[status]}`}
        >
          {statusDots[status]}{" "}
          {status === "online"
            ? "Online"
            : status === "offline"
              ? "Offline"
              : "Degraded"}
        </div>

        {/* Metrics */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Queries:</span>
            <span className="font-semibold text-gray-900">
              {queries.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Latencia:</span>
            <span className="font-semibold text-gray-900">{latency}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Error Rate:</span>
            <span
              className={`font-semibold ${
                errorRate > 1 ? "text-red-600" : "text-green-600"
              }`}
            >
              {errorRate}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t pt-3">
          <button
            onClick={onConfig}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded border border-gray-200 transition-colors"
          >
            <Cog size={16} />
            Configurar
          </button>
          <button
            onClick={onMore}
            className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded border border-gray-200 transition-colors"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
