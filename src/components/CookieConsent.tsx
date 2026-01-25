"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Show banner after a short delay
      setTimeout(() => setShow(true), 1000);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);

    // Update Google Analytics consent
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "granted",
      });
    }
  };

  const declineCookies = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShow(false);

    // Deny Google Analytics consent
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
      });
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t-2 border-slate-200 shadow-2xl"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Content */}
              <div className="flex-1 pr-4">
                <h3 className="text-lg font-bold text-text-main mb-2">
                  🍪 Usamos cookies
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Utilizamos cookies para mejorar tu experiencia, analizar el
                  tráfico del sitio y personalizar el contenido. Al hacer clic
                  en &quot;Aceptar&quot;, aceptás el uso de todas las cookies.
                  Podés leer más en nuestra{" "}
                  <a
                    href="/privacy"
                    className="text-primary underline hover:text-primary-dark"
                  >
                    Política de Privacidad
                  </a>
                  .
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={declineCookies}
                  className="px-6 py-3 text-sm font-bold text-text-secondary hover:text-text-main transition-colors rounded-xl border-2 border-slate-200 hover:border-slate-300"
                >
                  Rechazar
                </button>
                <button
                  onClick={acceptCookies}
                  className="px-6 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                  Aceptar todas
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={declineCookies}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors md:hidden"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
