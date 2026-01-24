"use client";
import React from "react";
import { ThumbsUp, ThumbsDown, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

const Qualification = () => {
  return (
    <section className="py-32 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-10 rounded-3xl bg-primary/[0.02] border border-primary/5 shadow-premium"
          >
            <h3 className="text-xl font-bold text-text-main mb-8 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <ThumbsUp className="text-green-600" size={18} />
              </div>
              Esto es para vos si...
            </h3>
            <ul className="space-y-6">
              {[
                "Buscás un socio tecnológico a largo plazo, no solo un proveedor puntual.",
                "Entendés que una web profesional es una inversión para generar ventas.",
                "Querés delegar la parte técnica para enfocarte en escalar tu negocio.",
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <CheckCircle2
                    className="text-green-500 shrink-0 mt-0.5"
                    size={18}
                  />
                  <span className="text-text-secondary text-[15px] font-medium leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-10 rounded-3xl bg-slate-50/50 border border-slate-100/50 shadow-premium"
          >
            <h3 className="text-xl font-bold text-text-main mb-8 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <ThumbsDown className="text-red-500" size={18} />
              </div>
              No es para vos si...
            </h3>
            <ul className="space-y-6">
              {[
                "Estás buscando la opción de menor costo del mercado sin priorizar la calidad.",
                "Necesitás la web para &quot;ayer&quot; y no podés dedicar tiempo al proceso estratégico.",
                "No considerás que el diseño y la performance influyan en tus objetivos comerciales.",
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <XCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                  <span className="text-text-secondary text-[15px] font-medium leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Qualification;
