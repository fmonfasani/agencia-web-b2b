"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackCTAClick, trackNavigation } from "@/lib/analytics";

const Header = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Servicios", href: "/#servicios" },
    { name: "Proceso", href: "/#proceso" },
    { name: "Precios", href: "/pricing" },
  ];

  const handleCTAClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsOpen(false);

    // Track CTA click
    trackCTAClick("header", "Agendar llamada");

    if (pathname === "/") {
      const contactSection = document.getElementById("contacto");
      contactSection?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/#contacto";
    }
  };

  const handleNavigation = (
    href: string,
    itemName: string,
    e: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    e.preventDefault();
    setIsOpen(false);

    // Track navigation click
    trackNavigation(href, "header_nav");

    if (href.startsWith("/#")) {
      const elementId = href.replace("/#", "");

      if (pathname === "/") {
        const element = document.getElementById(elementId);
        element?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = href;
      }
    } else {
      window.location.href = href;
    }
  };

  return (
    <header className="sticky top-0 z-[100] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Code2 size={22} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-text-main uppercase">
              Agencia Web
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (pathname === "/" && item.href.startsWith("/#"));
              return (
                <a
                  key={item.name}
                  className={`text-[13px] font-bold uppercase tracking-widest transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-text-secondary hover:text-primary"
                  }`}
                  href={item.href}
                  onClick={(e) => handleNavigation(item.href, item.name, e)}
                >
                  {item.name}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-6">
            <a
              className="hidden md:flex bg-text-main hover:bg-primary text-white text-[12px] font-bold uppercase tracking-widest px-6 py-3 rounded-full transition-all duration-300 shadow-xl shadow-slate-200"
              href="#contacto"
              onClick={handleCTAClick}
            >
              Agendar llamada
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
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (pathname === "/" && item.href.startsWith("/#"));
                return (
                  <a
                    key={item.name}
                    className={`block text-lg font-bold ${
                      isActive ? "text-primary" : "text-text-main"
                    }`}
                    href={item.href}
                    onClick={(e) => handleNavigation(item.href, item.name, e)}
                  >
                    {item.name}
                  </a>
                );
              })}
              <a
                className="block w-full text-center bg-primary text-white py-4 rounded-xl font-bold"
                href="#contacto"
                onClick={handleCTAClick}
              >
                Agendar llamada
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
