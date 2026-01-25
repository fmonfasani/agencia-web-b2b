"use client";
import React from "react";
import Link from "next/link";
import { MoveLeft, Home } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center section-padding bg-surface technical-grid relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />

        <div className="max-w-md w-full px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 inline-flex items-center justify-center size-24 rounded-3xl bg-primary/5 text-primary border border-primary/10 shadow-lg shadow-primary/5"
          >
            <span className="text-4xl font-black">404</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-extrabold text-text-main mb-4 tracking-tight"
          >
            Página no encontrada
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary font-medium mb-12"
          >
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              <Home size={18} />
              Volver al inicio
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-text-main font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <MoveLeft size={18} />
              Regresar
            </button>
          </motion.div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
