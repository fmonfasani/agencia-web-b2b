"use client";
import React from "react";
import { Code2, ArrowUpRight, Send, Mail, MapPin, Phone } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer
      className="bg-[#0a0a0b] text-white pt-32 pb-16 relative overflow-hidden"
      id="contacto"
    >
      {/* Background Subtle Gradient */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 lg:gap-32">
          {/* Brand & Claim */}
          <div className="lg:col-span-6 space-y-12">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Code2 size={24} />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                Agencia Web
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight text-white max-w-lg">
              Construimos el activo digital más valioso de tu empresa.
            </h2>

            <div className="flex flex-wrap gap-10 text-sm text-slate-400 font-medium">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white/50">
                  <MapPin size={14} />
                  <span className="text-[11px] uppercase tracking-widest font-bold">
                    Ubicación
                  </span>
                </div>
                <p>Buenos Aires, Argentina</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white/50">
                  <Mail size={14} />
                  <span className="text-[11px] uppercase tracking-widest font-bold">
                    Email
                  </span>
                </div>
                <p className="hover:text-primary transition-colors cursor-pointer">
                  hola@agenciaweb.com
                </p>
              </div>
            </div>
          </div>

          {/* Quick Contact Form (Simplified) */}
          <div className="lg:col-span-6">
            <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[32px] backdrop-blur-md">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                Iniciemos un proyecto
                <ArrowUpRight className="text-primary" size={20} />
              </h3>

              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">
                      Nombre Colaborador
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                      placeholder="Ej. Juan Perez"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">
                      Email Corporativo
                    </label>
                    <input
                      type="email"
                      className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                      placeholder="juan@empresa.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1">
                    Mensaje
                  </label>
                  <textarea
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                    placeholder="¿Cómo podemos ayudarte?"
                  />
                </div>
                <button className="w-full bg-primary hover:bg-primary-dark text-white h-14 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                  Enviar consulta
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Editorial Footer Bottom */}
        <div className="mt-40 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex gap-8 text-[11px] font-bold uppercase tracking-widest text-white/30">
            <a href="#" className="hover:text-white transition-colors">
              Términos
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacidad
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Cookies
            </a>
          </div>

          <p className="text-[12px] font-medium text-white/20">
            © {new Date().getFullYear()} Agencia Web. Mantenido con estándares
            de alto rendimiento.
          </p>

          <div className="flex gap-6 group">
            <div className="w-8 h-[1px] bg-white/10 self-center" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              B2B SPECIALISTS
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
