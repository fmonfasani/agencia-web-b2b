"use client";
import React from "react";
import { motion } from "framer-motion";
import { Clock, Globe, ShieldCheck, User } from "lucide-react";
import { useTranslations } from "next-intl";

const PricingHero = () => {
  // Inicializamos el hook apuntando al namespace 'Pricing.Hero' para textos específicos de esta sección
  const t = useTranslations("Pricing.Hero");

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
            {t("titleStart")}{" "}
            <span className="text-primary">{t("titleHighlight")}</span>{" "}
            {t("titleEnd")}
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto font-medium mb-10 text-balance">
            {t("subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm font-bold text-text-main/70 uppercase tracking-widest"
            >
              {i === 0 && <Clock size={16} className="text-primary" />}
              {i === 1 && <Globe size={16} className="text-primary" />}
              {i === 2 && <ShieldCheck size={16} className="text-primary" />}
              {i === 3 && <User size={16} className="text-primary" />}
              <span>{t(`features.${i}`)}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PricingHero;
