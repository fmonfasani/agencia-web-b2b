"use client";
import React from "react";
import { Rocket, Building2, ShieldCheck, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const Services = () => {
  // Hook para obtener traducciones del namespace 'Services'
  const t = useTranslations("Services");

  const servicesConfig = [
    {
      id: "landing",
      icon: Rocket,
      highlight: false,
      color: "blue",
      featureCount: 4,
    },
    {
      id: "corporate",
      icon: Building2,
      highlight: true,
      color: "primary",
      featureCount: 5,
    },
    {
      id: "scale",
      icon: ShieldCheck,
      highlight: false,
      color: "purple",
      featureCount: 4,
    },
  ];

  return (
    <section className="section-padding bg-white" id="servicios">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="opacity-0 text-primary font-bold text-[12px] tracking-[0.2em] uppercase mb-4 block"
          >
            {t("label")}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="opacity-0 text-4xl md:text-5xl font-extrabold text-text-main mt-2 mb-6 tracking-tight text-balance"
          >
            {t("title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="opacity-0 text-text-secondary font-medium text-lg text-balance"
          >
            {t("subtitle")}
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="opacity-0 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch"
        >
          {servicesConfig.map((service) => (
            <motion.div
              key={service.id}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className={`flex flex-col p-10 rounded-3xl border transition-[box-shadow,gap,border-color,background-color] duration-300 h-full relative group
                ${
                  service.highlight
                    ? "border-primary/20 bg-primary/2 shadow-premium-hover z-10 lg:-translate-y-6 scale-[1.02]"
                    : "border-slate-100 bg-white shadow-premium hover:shadow-premium-hover"
                }
              `}
            >
              {service.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow-lg shadow-primary/20 tracking-widest uppercase">
                  {t(`cards.${service.id}.tag`)}
                </div>
              )}

              <div className="mb-10">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500
                  ${service.highlight ? "bg-primary text-white" : "bg-primary/5 text-primary"}
                  ${service.color === "purple" ? "bg-purple-50 text-purple-600" : ""}
                `}
                >
                  <service.icon size={28} strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-bold text-text-main tracking-tight mb-4">
                  {t(`cards.${service.id}.title`)}
                </h3>
                <p className="text-[15px] leading-relaxed text-text-secondary font-medium">
                  {t(`cards.${service.id}.description`)}
                </p>
              </div>

              <ul className="flex-1 space-y-5 mb-12">
                {Array.from({ length: service.featureCount }).map(
                  (_, fIndex) => (
                    <li
                      key={fIndex}
                      className="flex items-start gap-4 text-[14px] text-text-main font-semibold"
                    >
                      <div className="mt-1 shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check
                          className="text-primary"
                          size={12}
                          strokeWidth={3}
                        />
                      </div>
                      <span>{t(`cards.${service.id}.features.${fIndex}`)}</span>
                    </li>
                  ),
                )}
              </ul>

              <a
                className={`w-full block text-center py-4 rounded-xl font-bold transition-all text-sm uppercase tracking-widest
                  ${
                    service.highlight
                      ? "bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/25"
                      : "bg-slate-50 text-text-main hover:bg-slate-100 border border-slate-200"
                  }
                `}
                href="#contacto"
              >
                {t(`cards.${service.id}.cta`)}
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
