"use client";
import React from "react";
import { PhoneCall } from "lucide-react";
import { motion } from "framer-motion";

const PricingCTA = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-primary/5 border border-primary/10 rounded-[40px] p-12 md:p-20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <PhoneCall size={120} className="text-primary rotate-12" />
          </div>

          <h2 className="text-3xl md:text-5xl font-extrabold text-text-main mb-6 tracking-tight relative z-10">
            ¿No sabés qué plan te conviene?
          </h2>
          <p className="text-lg md:text-xl text-text-secondary font-medium mb-12 max-w-xl mx-auto relative z-10">
            Agendá una llamada y te recomendamos la mejor opción según tu
            negocio.
          </p>

          <a
            href="#contacto"
            className="inline-flex items-center justify-center h-16 px-12 rounded-2xl bg-primary text-white font-bold text-lg hover:bg-primary-dark transition-all shadow-xl shadow-primary/30 relative z-10"
          >
            Agendar llamada
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingCTA;
