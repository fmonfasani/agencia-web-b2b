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
    color: "#22c55e",
  },
  {
    icon: "🤖",
    text: "Agente Ventas procesó 847 queries",
    sub: "Tasa de éxito: 98.2%",
    color: "#3b82f6",
  },
  {
    icon: "💳",
    text: "Nueva suscripción Enterprise",
    sub: "$499/mes — pago confirmado",
    color: "#f59e0b",
  },
  {
    icon: "⚡",
    text: "Latencia promedio: 124ms",
    sub: "Por debajo del SLA de 200ms",
    color: "#22c55e",
  },
  {
    icon: "👥",
    text: "3 miembros invitados a Nexo Agency",
    sub: "Roles: Analyst, Viewer",
    color: "#3b82f6",
  },
  {
    icon: "📊",
    text: "Reporte exportado — 2,340 filas",
    sub: "Reporte de uso · Marzo 2026",
    color: "#6b7280",
  },
  {
    icon: "🔔",
    text: "Webhook disparado: payment.success",
    sub: "Respuesta 200 · 89ms",
    color: "#f59e0b",
  },
  {
    icon: "🏆",
    text: "10K queries · Media Agency",
    sub: "Milestone del plan Enterprise",
    color: "#22c55e",
  },
  {
    icon: "🔐",
    text: "Nuevo acceso desde Buenos Aires",
    sub: "IP verificada · TLS 1.3",
    color: "#3b82f6",
  },
  {
    icon: "📈",
    text: "MRR alcanzó $1.24M este mes",
    sub: "+12% vs mes anterior",
    color: "#22c55e",
  },
];

let idCounter = 1000;

export default function LiveActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>(() =>
    EVENT_POOL.slice(0, 4).map((e, i) => ({ ...e, id: i })),
  );

  useEffect(() => {
    let nextIndex = 4;
    const interval = setInterval(() => {
      idCounter++;
      const currentId = idCounter;
      const next = EVENT_POOL[nextIndex % EVENT_POOL.length];
      nextIndex++;
      setEvents((prev) => [{ ...next, id: currentId }, ...prev.slice(0, 3)]);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <p className="text-white/25 text-[9px] font-semibold uppercase tracking-[0.15em]">
          Actividad en vivo
        </p>
      </div>

      <AnimatePresence initial={false}>
        {events.map((event, i) => (
          <motion.div
            key={event.id}
            layout
            initial={{ opacity: 0, y: -12 }}
            animate={{
              opacity: 1 - i * 0.22,
              y: 0,
            }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02]"
          >
            <span className="text-sm leading-none flex-shrink-0">
              {event.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs font-medium leading-snug truncate">
                {event.text}
              </p>
              <p className="text-white/25 text-[10px] mt-0.5 truncate">
                {event.sub}
              </p>
            </div>
            <span
              className="w-1 h-1 rounded-full flex-shrink-0 opacity-70"
              style={{ backgroundColor: event.color }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
