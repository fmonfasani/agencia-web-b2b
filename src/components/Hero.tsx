"use client";
import React from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="relative pt-24 pb-20 md:pt-32 md:pb-40 bg-white overflow-hidden technical-grid">
      <div className="absolute inset-0 glow-mesh pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Left Content */}
          <div className="lg:w-6/12 flex flex-col items-start text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-[11px] font-bold uppercase tracking-wider mb-8 border border-primary/10"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
              Performance-Driven B2B
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-text-main leading-[1.05] mb-8 text-balance"
            >
              Convertí tu web en una{" "}
              <span className="text-primary">máquina</span> de consultas
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-text-secondary max-w-lg mb-12 leading-relaxed font-medium"
            >
              Desarrollamos sitios de alto rendimiento especializados en
              servicios B2B. Entrega rápida, soporte directo y enfoque total en
              conversiones.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto"
            >
              <a
                className="w-full sm:w-auto inline-flex items-center justify-center h-14 px-10 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 group"
                href="#contacto"
              >
                Agendar llamada
                <ArrowRight
                  className="ml-2 group-hover:translate-x-1 transition-transform"
                  size={20}
                />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4 text-[13px] font-bold text-text-secondary uppercase tracking-widest"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-primary/40" size={18} />
                <span>7-14 días</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-primary/40" size={18} />
                <span>Zero Legacy</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-primary/40" size={18} />
                <span>Soporte Senior</span>
              </div>
            </motion.div>
          </div>

          {/* Right Visual Protagonist (Technical Abstract) */}
          <div className="lg:w-6/12 relative perspective-1000 hidden lg:block">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative aspect-square max-w-[500px] ml-auto"
            >
              {/* Abstract Technical Diagram */}
              <div className="absolute inset-0 glass-card rounded-3xl overflow-hidden border-primary/10">
                <svg
                  className="w-full h-full p-8"
                  viewBox="0 0 400 400"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  {/* Grid Lines */}
                  {[...Array(10)].map((_, i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={i * 40}
                      x2="400"
                      y2={i * 40}
                      stroke="#e2e8f0"
                      strokeWidth="0.5"
                    />
                  ))}
                  {[...Array(10)].map((_, i) => (
                    <line
                      key={i}
                      x1={i * 40}
                      y1="0"
                      x2={i * 40}
                      y2="400"
                      stroke="#e2e8f0"
                      strokeWidth="0.5"
                    />
                  ))}

                  {/* Technical Performance Curve */}
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    d="M40 320 Q 120 320, 160 200 T 360 80"
                    stroke="url(#lineGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />

                  {/* Nodes */}
                  <motion.circle
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    cx="40"
                    cy="320"
                    r="5"
                    fill="#135bec"
                  />
                  <motion.circle
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.0 }}
                    cx="160"
                    cy="200"
                    r="5"
                    fill="#135bec"
                  />
                  <motion.circle
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.5 }}
                    cx="360"
                    cy="80"
                    r="6"
                    fill="#135bec"
                  />

                  {/* Floating Elements (Data nodes) */}
                  <motion.rect
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    x="280"
                    y="240"
                    width="60"
                    height="30"
                    rx="8"
                    fill="white"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                  <motion.text
                    x="295"
                    y="260"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#64748b"
                  >
                    LEADS
                  </motion.text>

                  <motion.rect
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    x="60"
                    y="80"
                    width="80"
                    height="30"
                    rx="8"
                    fill="white"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                  <motion.text
                    x="75"
                    y="100"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#135bec"
                  >
                    UPLOAD 0.2s
                  </motion.text>

                  <defs>
                    <linearGradient
                      id="lineGrad"
                      x1="40"
                      y1="320"
                      x2="360"
                      y2="80"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#e2e8f0" />
                      <stop offset="1" stopColor="#135bec" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Secondary Decorative Layers */}
                <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-300">
                  HTTP/3.0 STABLE
                </div>
                <div className="absolute bottom-4 left-4 flex gap-1">
                  <div className="h-1 w-8 bg-primary/20 rounded-full" />
                  <div className="h-1 w-4 bg-primary rounded-full" />
                </div>
              </div>

              {/* Background Glows */}
              <div className="absolute -z-10 -top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -z-10 -bottom-10 -left-10 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
