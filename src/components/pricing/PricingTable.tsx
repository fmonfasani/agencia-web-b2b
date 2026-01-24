"use client";
import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Landing Profesional",
    ideal: "Ideal para campañas, validación, servicios puntuales",
    setup: "299",
    maint: "29.99",
    features: [
      "Landing one-page",
      "Diseño moderno responsive",
      "Textos orientados a contacto",
      "Hosting + SSL",
      "Formulario + WhatsApp",
      "Entrega en 7–10 días",
    ],
    highlight: false,
  },
  {
    name: "Web Profesional + Marketplace",
    ideal: "Ideal para empresas en crecimiento",
    setup: "1.499",
    maint: "149",
    features: [
      "Web corporativa (hasta 6 secciones)",
      "Panel autoadministrable",
      "Módulo marketplace (servicios/productos)",
      "SEO básico",
      "Hosting administrado",
      "Seguridad reforzada",
      "Entrega en 14–21 días",
    ],
    highlight: true,
    badge: "Más elegido",
  },
  {
    name: "Web Corporativa Premium",
    ideal: "Ideal para empresas que venden servicios de alto valor",
    setup: "2.399",
    maint: "239",
    features: [
      "Web corporativa completa",
      "Diseño premium",
      "Blog / noticias",
      "SEO on-page avanzado",
      "Integraciones CRM / Analytics",
      "Hosting de alto rendimiento",
    ],
    highlight: false,
  },
];

const PricingTable = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`flex flex-col p-8 rounded-[32px] border transition-all relative ${
                plan.highlight
                  ? "border-primary/20 bg-primary/[0.02] shadow-premium-hover scale-[1.05] z-10"
                  : "border-slate-100 bg-white shadow-premium"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">
                  {plan.badge}
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-text-main mb-2">
                  {plan.name}
                </h3>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-6">
                  {plan.ideal}
                </p>

                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-text-secondary">
                      USD
                    </span>
                    <span className="text-4xl font-extrabold text-text-main">
                      {plan.setup}
                    </span>
                    <span className="text-sm font-semibold text-text-secondary">
                      setup
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 text-primary">
                    <span className="text-sm font-bold">+ USD</span>
                    <span className="text-2xl font-extrabold">
                      {plan.maint}
                    </span>
                    <span className="text-sm font-semibold opacity-80">
                      / mes
                    </span>
                  </div>
                </div>
              </div>

              <ul className="flex-1 space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm font-medium text-text-main"
                  >
                    <div className="mt-0.5 size-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check
                        className="text-primary"
                        size={12}
                        strokeWidth={3}
                      />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#contacto"
                className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  plan.highlight
                    ? "bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20"
                    : "bg-slate-50 text-text-main hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Agendar llamada
                <ArrowRight size={16} />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingTable;
