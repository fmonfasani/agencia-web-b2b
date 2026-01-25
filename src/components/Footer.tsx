"use client";
import React, { useState } from "react";
import {
  Code2,
  ArrowUpRight,
  Send,
  Mail,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackFormSubmit } from "@/lib/analytics";

const Footer = () => {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", message: "" });

        // Track successful form submission
        trackFormSubmit("footer_contact_form", {
          form_location: "footer",
          user_name: formData.name,
        });
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setStatus("error");
    }
  };

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

          {/* Quick Contact Form */}
          <div className="lg:col-span-6">
            <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[32px] backdrop-blur-md relative overflow-hidden h-full flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center py-10"
                  >
                    <div className="size-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">
                      ¡Consulta enviada!
                    </h3>
                    <p className="text-slate-400 text-sm mb-8">
                      Te contactaremos en menos de 24 horas para agendar tu
                      llamada.
                    </p>
                    <button
                      onClick={() => setStatus("idle")}
                      className="text-primary text-sm font-bold uppercase tracking-widest hover:underline"
                    >
                      Enviar otro mensaje
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                      Iniciemos un proyecto
                      <ArrowUpRight className="text-primary" size={20} />
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label
                            htmlFor="name"
                            className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1"
                          >
                            Nombre Colaborador
                          </label>
                          <input
                            id="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                            placeholder="Ej. Juan Perez"
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor="email"
                            className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1"
                          >
                            Email Corporativo
                          </label>
                          <input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                            placeholder="juan@empresa.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="message"
                          className="text-[11px] uppercase tracking-widest font-bold text-white/40 ml-1"
                        >
                          Mensaje
                        </label>
                        <textarea
                          id="message"
                          rows={4}
                          required
                          value={formData.message}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              message: e.target.value,
                            })
                          }
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                          placeholder="¿Cómo podemos ayudarte?"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white h-14 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                      >
                        {status === "loading"
                          ? "Enviando..."
                          : "Enviar consulta"}
                        <Send size={16} />
                      </button>
                      {status === "error" && (
                        <p className="text-red-400 text-xs text-center mt-4">
                          Hubo un error. Por favor, reintenta o escribinos por
                          WhatsApp.
                        </p>
                      )}
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
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
