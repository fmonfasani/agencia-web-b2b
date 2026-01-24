"use client";
import React from "react";
import { motion } from "framer-motion";

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
  return (
    <section
      className="py-32 bg-surface technical-grid relative overflow-hidden"
      id="proceso"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-24">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-extrabold text-text-main tracking-tight mb-4"
          >
            Nuestra Metodología
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-text-secondary font-medium text-lg"
          >
            Un flujo de trabajo riguroso diseñado para la previsibilidad y la
            excelencia.
          </motion.p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-16">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative z-10 flex flex-col items-center text-center group"
            >
              {/* Technical connector line */}
              {index !== steps.length - 1 && (
                <div className="hidden md:block absolute top-[26px] left-[calc(50%+26px)] w-[calc(100%-52px)] h-[1px] bg-slate-200 border-t border-dashed border-slate-300 -z-10 group-hover:border-primary/30 transition-colors" />
              )}

              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center font-mono text-xs font-bold text-primary shadow-sm mb-8 transition-all duration-500 group-hover:border-primary group-hover:ring-4 group-hover:ring-primary/5">
                {step.number}
              </div>

              <h3 className="text-lg font-bold text-text-main mb-4 tracking-tight group-hover:text-primary transition-colors">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary font-medium px-2">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Process;
