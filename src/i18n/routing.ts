import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  // Lista de todos los idiomas soportados por la aplicación
  locales: ["en", "es"],

  // Idioma por defecto si no coincide ninguno
  defaultLocale: "es",
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
