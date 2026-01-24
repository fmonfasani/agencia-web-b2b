"use client";
import React from "react";
import { Code2, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-[100] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="size-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Code2 size={22} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-text-main uppercase">
              Agencia Web
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-10">
            {["Servicios", "Proceso", "Contacto"].map((item) => (
              <a
                key={item}
                className="text-[13px] font-bold uppercase tracking-widest text-text-secondary hover:text-primary transition-colors"
                href={`#${item.toLowerCase()}`}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <a
              className="hidden md:flex bg-text-main hover:bg-primary text-white text-[12px] font-bold uppercase tracking-widest px-6 py-3 rounded-full transition-all duration-300 shadow-xl shadow-slate-200"
              href="#contacto"
            >
              Agendar Llamada
            </a>
            <button
              className="md:hidden p-2 text-text-main"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="px-4 py-8 space-y-6">
              {["Servicios", "Proceso", "Contacto"].map((item) => (
                <a
                  key={item}
                  className="block text-lg font-bold text-text-main"
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setIsOpen(false)}
                >
                  {item}
                </a>
              ))}
              <a
                className="block w-full text-center bg-primary text-white py-4 rounded-xl font-bold"
                href="#contacto"
                onClick={() => setIsOpen(false)}
              >
                Agendar Llamada
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
