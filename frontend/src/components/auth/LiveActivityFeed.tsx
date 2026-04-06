"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ActivityEvent {
  id: number;
  icon: string;
  text: string;
  sub: string;
  color: string;
}

const EVENT_POOL: Omit<ActivityEvent, "id">[] = [
  {
    icon: "🏢",
    text: "TechCorp Argentina se registró",
    sub: "Plan Pro activado",
    color: "#10B981",
  },
  {
    icon: "🤖",
    text: "Agente Ventas procesó 847 queries",
    sub: "Tasa de éxito: 98.2%",
    color: "#135bec",
  },
  {
    icon: "💳",
    text: "Nueva suscripción Enterprise",
    sub: "$499/mes — pago confirmado",
    color: "#FBBF24",
  },
  {
    icon: "⚡",
    text: "Latencia promedio: 124ms",
    sub: "Por debajo del SLA de 200ms",
    color: "#10B981",
  },
  {
    icon: "👥",
    text: "3 miembros invitados a Nexo Agency",
    sub: "Roles: Analyst, Viewer",
    color: "#135bec",
  },
  {
    icon: "📊",
    text: "Reporte exportado — 2,340 filas",
    sub: "Reporte de uso · Marzo 2026",
    color: "#8b92a5",
  },
  {
    icon: "🔔",
    text: "Webhook disparado: payment.success",
    sub: "Respuesta 200 · 89ms",
    color: "#FBBF24",
  },
  {
    icon: "🏆",
    text: "10K queries alcanzado · Media Agency",
    sub: "Milestone del plan Enterprise",
    color: "#10B981",
  },
  {
    icon: "🔐",
    text: "Inicio de sesión desde Buenos Aires",
    sub: "IP verificada · TLS 1.3",
    color: "#135bec",
  },
  {
    icon: "📈",
    text: "MRR subió a $1.24M este mes",
    sub: "+12% vs mes anterior",
    color: "#10B981",
  },
];

let idCounter = 0;

export default function LiveActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>(() =>
    EVENT_POOL.slice(0, 4).map((e, i) => ({ ...e, id: i })),
  );
  const [poolIndex, setPoolIndex] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents((prev) => {
        idCounter++;
        const next = EVENT_POOL[poolIndex % EVENT_POOL.length];
        return [{ ...next, id: idCounter }, ...prev.slice(0, 3)];
      });
      setPoolIndex((i) => i + 1);
    }, 3200);

    return () => clearInterval(interval);
  }, [poolIndex]);

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
        </span>
        <p className="text-[#4a5168] text-xs font-semibold uppercase tracking-widest">
          Actividad en vivo
        </p>
      </div>

      <AnimatePresence initial={false}>
        {events.map((event, i) => (
          <motion.div
            key={event.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{
              opacity: 1 - i * 0.18,
              y: 0,
              scale: 1 - i * 0.012,
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-start gap-3 p-3 rounded-xl border border-[#2a2f3e] bg-[#161923]/80 backdrop-blur-sm"
          >
            <span className="text-base leading-none mt-0.5 flex-shrink-0">
              {event.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium leading-snug truncate">
                {event.text}
              </p>
              <p className="text-[#4a5168] text-[10px] mt-0.5 truncate">
                {event.sub}
              </p>
            </div>
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
              style={{ backgroundColor: event.color }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
