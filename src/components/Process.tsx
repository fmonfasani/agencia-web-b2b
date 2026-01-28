"use client";
import React from "react";
import { motion } from "framer-motion";
import { GitCommit } from "lucide-react";
import { useTranslations } from "next-intl";

const steps = [
  {
    number: "01",
    title: "Briefing Técnico",
    description:
      "Analizamos tu funnel comercial y detectamos las fugas de conversión actuales.",
  },
  {
    number: "02",
    title: "Estrategia Visual",
    description:
      "Definimos la arquitectura y el lenguaje visual que transmitirá autoridad.",
  },
  {
    number: "03",
    title: "Sprint de Desarrollo",
    description:
      "Construcción modular bajo estándares de performance extrema (90+ PageSpeed).",
  },
  {
    number: "04",
    title: "Lanzamiento & QA",
    description:
      "Despliegue controlado con monitoreo de métricas y capacitación de equipo.",
  },
];

const Process = () => {
  const t = useTranslations('Process');

  return (
    <section
      className="section-padding bg-surface technical-grid relative overflow-hidden"
      id="proceso"
    >
      <div className="absolute top-[160px] left-[50%] -translate-x-1/2 w-px h-[calc(100%-300px)] bg-linear-to-b from-transparent via-primary/20 to-transparent hidden lg:block" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6"
          >
            <GitCommit size={14} />
            {t('chip')}
          </motion.div>
          <motion.h2
            className="text-3xl md:text-5xl font-extrabold text-text-main mb-6 tracking-tight"
          >
            {t('title')}
          </motion.h2>
          <motion.p
            className="text-lg text-text-secondary leading-relaxed font-medium"
          >
            {t('subtitle')}
          </motion.p>
        </motion.div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="absolute top-8 left-0 w-full h-px bg-linear-to-r from-transparent via-primary/30 to-transparent lg:hidden" />
              {index !== 3 && (
                <div className="hidden md:block absolute top-[26px] left-[calc(50%+26px)] w-[calc(100%-52px)] h-[1px] bg-slate-200 border-t border-dashed border-slate-300 -z-10 group-hover:border-primary/30 transition-colors" />
              )}

              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center font-mono text-xs font-bold text-primary shadow-sm mb-8 transition-all duration-500 group-hover:border-primary group-hover:ring-4 group-hover:ring-primary/5">
                {`0${index + 1}`}
              </div>

              <h3 className="text-lg font-bold text-text-main mb-4 tracking-tight group-hover:text-primary transition-colors">
                {t(`steps.${index}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary font-medium px-2">
                {t(`steps.${index}.description`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Process;
