"use client";
import React from "react";
import { Shield, Clock, HardDrive, Headphones, Activity } from "lucide-react";
import { motion } from "framer-motion";

import { useTranslations } from "next-intl";

const PricingMaintenance = () => {
  // Inicializamos el hook apuntando al namespace 'Pricing.Maintenance'
  const t = useTranslations("Pricing.Maintenance");
  return (
    <section className="section-padding bg-surface technical-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Mantenimiento */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-extrabold text-text-main mb-8 tracking-tight">
              {t("title")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm"
                >
                  <div className="size-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                    {i === 0 && <HardDrive size={20} strokeWidth={2.5} />}
                    {i === 1 && <Clock size={20} strokeWidth={2.5} />}
                    {i === 2 && <Shield size={20} strokeWidth={2.5} />}
                    {i === 3 && <Headphones size={20} strokeWidth={2.5} />}
                    {i === 4 && <Activity size={20} strokeWidth={2.5} />}
                  </div>
                  <span className="text-sm font-bold text-text-main">
                    {t(`features.${i}`)}
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
            className="p-10 rounded-3xl bg-white border border-slate-100 shadow-premium"
          >
            <h3 className="text-xl font-bold text-text-main mb-6">
              {t("clearTitle")}
            </h3>
            <ul className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-text-secondary font-medium"
                >
                  <div className="size-1.5 rounded-full bg-primary" />
                  <span>{t(`clearPoints.${i}`)}</span>
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
