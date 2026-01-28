"use client";
import React from "react";
import {
  TimerOff,
  BadgeDollarSign,
  ShieldAlert,
  LaptopMinimal,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const PainPoints = () => {
  const t = useTranslations('PainPoints');
  const points = [
    { id: 'slow', icon: TimerOff, color: 'red' },
    { id: 'sales', icon: BadgeDollarSign, color: 'orange' },
    { id: 'security', icon: ShieldAlert, color: 'yellow' },
    { id: 'outdated', icon: LaptopMinimal, color: 'gray' },
  ];

  return (
    <section className="section-padding bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-text-main mb-6 tracking-tight text-balance"
          >
            {t('title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-text-secondary font-medium text-lg text-balance"
          >
            {t('subtitle')}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {points.map((point, index) => (
            <motion.div
              key={point.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group bg-white p-8 rounded-3xl border border-slate-100 hover:border-slate-200 shadow-premium hover:shadow-premium-hover transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300
                ${point.color === "red" ? "bg-red-50 text-red-500" : ""}
                ${point.color === "orange" ? "bg-orange-50 text-orange-500" : ""}
                ${point.color === "yellow" ? "bg-yellow-50 text-yellow-600" : ""}
                ${point.color === "gray" ? "bg-slate-50 text-slate-500" : ""}
              `}
              >
                <point.icon size={22} strokeWidth={2.5} />
              </div>
              <h3 className="text-[17px] font-bold text-text-main mb-3 tracking-tight">
                {t(`cards.${point.id}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary font-medium">
                {t(`cards.${point.id}.description`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PainPoints;
