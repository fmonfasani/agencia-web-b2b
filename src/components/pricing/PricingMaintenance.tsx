"use client";
import React from "react";
import {
  Shield,
  Clock,
  HardDrive,
  Headphones,
  Activity,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

const PricingMaintenance = () => {
  return (
    <section className="py-24 bg-surface technical-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Mantenimiento */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-extrabold text-text-main mb-8 tracking-tight">
              ¿Qué incluye el mantenimiento?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: HardDrive, title: "Hosting administrado" },
                { icon: Clock, title: "Backups diarios" },
                { icon: Shield, title: "Seguridad proactiva" },
                { icon: Headphones, title: "Soporte técnico real" },
                { icon: Activity, title: "Monitoreo uptime" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm"
                >
                  <div className="size-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                    <item.icon size={20} />
                  </div>
                  <span className="text-sm font-bold text-text-main">
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Reducción de Riesgo */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-10 rounded-[32px] bg-white border border-slate-100 shadow-premium"
          >
            <h3 className="text-xl font-bold text-text-main mb-6">
              Claridad absoluta
            </h3>
            <ul className="space-y-4">
              {[
                "Sin contratos largos ni letra chica",
                "Sin permanencia obligatoria",
                "Cambios grandes se presupuestan aparte",
                "Hablás directo con desarrolladores senior",
              ].map((text, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-text-secondary font-medium"
                >
                  <div className="size-1.5 rounded-full bg-primary" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PricingMaintenance;
