"use client";
import React from "react";
import { motion } from "framer-motion";
import { Clock, Globe, ShieldCheck, User } from "lucide-react";

const PricingHero = () => {
  return (
    <section className="relative pt-32 pb-20 bg-white technical-grid overflow-hidden">
      <div className="absolute inset-0 glow-mesh pointer-events-none opacity-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl md:text-6xl font-extrabold text-text-main tracking-tight mb-6 text-balance">
            Precios claros para <span className="text-primary">crecer</span> con
            tu web
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto font-medium mb-10 text-balance">
            Soluciones web con hosting incluido, soporte real y sin sorpresas.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4"
        >
          {[
            { icon: Clock, text: "Entrega en 7–21 días" },
            { icon: Globe, text: "Hosting incluido" },
            { icon: ShieldCheck, text: "Sin permanencia" },
            { icon: User, text: "Soporte humano" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm font-bold text-text-main/70 uppercase tracking-widest"
            >
              <item.icon size={16} className="text-primary" />
              <span>{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PricingHero;
