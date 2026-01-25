# 📐 Plan de Implementación - Agencia Web B2B

**Fecha:** 25 de Enero, 2026  
**Basado en:** Auditoría General (auditoria_general.md)  
**Objetivo:** Resolver bugs críticos, mejorar conversión y establecer bases sólidas para escalar

---

## 🎯 Estrategia General

### Fases de Implementación

1. **Fase 0 - Hotfixes Críticos** (Blocker) → 2-3 días
2. **Fase 1 - Foundation & SEO** → 1 semana
3. **Fase 2 - UX & Conversión** → 1 semana
4. **Fase 3 - Performance & Testing** → 3-5 días

**Total estimado:** 3-4 semanas de desarrollo

---

## 🔴 FASE 0: Hotfixes Críticos (P0 - Blocker)

### 1. Arreglar Navegación Multi-página

**Problema:** Links de hash navigation (`/#servicios`) no funcionan desde `/pricing`

**Solución:**

```typescript
// src/components/Header.tsx
// Crear función helper para navegación inteligente
const handleNavigation = (href: string, e: React.MouseEvent) => {
  e.preventDefault();

  if (href.startsWith("/#")) {
    // Si estamos en otra página, ir a home primero
    if (window.location.pathname !== "/") {
      window.location.href = href;
    } else {
      // Si ya estamos en home, hacer scroll suave
      const id = href.replace("/#", "");
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  } else {
    window.location.href = href;
  }
};
```

**Archivos a modificar:**

- `src/components/Header.tsx` (líneas 22-36)

**Effort:** S (2-3 horas)

---

### 2. Implementar Funcionalidad de Formulario de Contacto

**Problema:** Form del Footer no hace nada

**Solución: Opción A - API Route + Email Service**

```typescript
// src/app/api/contact/route.ts (NUEVO)
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  const { name, email, message } = await request.json();

  // Validación
  if (!name || !email || !message) {
    return NextResponse.json({ error: "Campos requeridos" }, { status: 400 });
  }

  // Enviar email (usar Resend, SendGrid, o SMTP)
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "hola@agenciaweb.com",
      subject: `Nueva consulta de ${name}`,
      html: `
        <h2>Nueva consulta desde la web</h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong> ${message}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
  }
}
```

**Solución: Opción B - Integración con Tally/Typeform (Más rápido)**
Reemplazar form por iframe de Tally.so (gratis, sin backend)

**Recomendación:** Opción B para MVP, Opción A para producción

**Archivos a modificar:**

- `src/components/Footer.tsx` (líneas 64-101)
- `src/app/api/contact/route.ts` (NUEVO)
- `.env.local` (NUEVO - variables SMTP)
- `package.json` (agregar `nodemailer` si Opción A)

**Effort:**

- Opción A: M (1 día)
- Opción B: S (2 horas)

---

### 3. Arreglar Botón WhatsApp

**Problema:** `href="#"` no hace nada

**Solución:**

```typescript
// src/components/WhatsAppButton.tsx (NUEVO)
'use client';
import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton({ phoneNumber = '+5491123456789', message = 'Hola, quiero consultar sobre sus servicios' }) {
  const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;

  return (
    <a
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-2xl transition-all hover:-translate-y-1 flex items-center justify-center group"
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MessageCircle size={28} />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold whitespace-nowrap">
        Contactanos
      </span>
    </a>
  );
}
```

Luego reemplazar en `page.tsx` y `pricing/page.tsx`:

```tsx
import WhatsAppButton from "@/components/WhatsAppButton";
// ...
<WhatsAppButton />;
```

**Archivos a modificar:**

- `src/components/WhatsAppButton.tsx` (NUEVO)
- `src/app/page.tsx` (líneas 22-33)
- `src/app/pricing/page.tsx` (líneas 20-31)

**Effort:** S (1 hora)

---

### 4. Logo Clickeable a Home

**Problema:** Logo no tiene link

**Solución:**

```tsx
// src/components/Header.tsx línea 13
<Link href="/" className="flex items-center gap-3">
  <div className="size-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
    <Code2 size={22} strokeWidth={2.5} />
  </div>
  <span className="text-lg font-extrabold tracking-tight text-text-main uppercase">
    Agencia Web
  </span>
</Link>
```

**Archivos a modificar:**

- `src/components/Header.tsx` (líneas 13-20)

**Effort:** XS (15 min)

---

## 🟡 FASE 1: Foundation & SEO (P1 - High)

### 5. Metadata SEO por Página

**Implementación:**

```typescript
// src/app/pricing/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios Claros | Agencia Web B2B",
  description:
    "Planes de desarrollo web con hosting incluido desde USD $299. Landing profesional, web corporativa y soporte técnico real.",
  openGraph: {
    title: "Precios Claros | Agencia Web B2B",
    description: "Desarrollo web profesional para empresas de servicios B2B",
    images: ["/og-image-pricing.jpg"],
    type: "website",
  },
};
```

**Crear también:**

- `src/app/opengraph-image.tsx` (dynamic OG image)
- `public/robots.txt`
- `src/app/sitemap.ts`

**Archivos a modificar/crear:**

- `src/app/pricing/page.tsx` (agregar export metadata)
- `src/app/page.tsx` (mover metadata desde layout)
- `src/app/layout.tsx` (mantener solo metadata global)
- `src/app/sitemap.ts` (NUEVO)
- `public/robots.txt` (NUEVO)

**Effort:** M (4-5 horas)

---

### 6. Structured Data (JSON-LD)

**Implementación:**

```typescript
// src/components/StructuredData.tsx (NUEVO)
export default function StructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "name": "Agencia Web",
    "description": "Desarrollo web B2B de alto rendimiento",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Buenos Aires",
      "addressCountry": "AR"
    },
    "priceRange": "USD 299 - USD 2,399",
    "url": "https://agenciaweb.com",
    "email": "hola@agenciaweb.com"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

Agregar en `layout.tsx`

**Effort:** S (2 horas)

---

### 7. Favicon Personalizado

**Implementación:**
Reemplazar `app/favicon.ico` con logo real de la agencia

**Crear:**

- `app/icon.png` (32x32, 192x192, 512x512 para PWA)
- `app/apple-icon.png` (180x180)
- `app/manifest.json` (para PWA futuro)

**Effort:** XS (30 min si ya existe el logo)

---

## 🟢 FASE 2: UX & Conversión (P1-P2)

### 8. Indicador de Página Activa en Nav

**Solución:**

```tsx
// src/components/Header.tsx
'use client';
import { usePathname } from 'next/navigation';

const Header = () => {
  const pathname = usePathname();

  const navItems = [
    { name: "Servicios", href: "/#servicios" },
    { name: "Proceso", href: "/#proceso" },
    { name: "Precios", href: "/pricing" },
  ];

  return (
    // ...
    {navItems.map((item) => {
      const isActive = pathname === item.href ||
                       (pathname === '/' && item.href.startsWith('/#'));

      return (
        <a
          key={item.name}
          className={`text-[13px] font-bold uppercase tracking-widest transition-colors ${
            isActive
              ? 'text-primary'
              : 'text-text-secondary hover:text-primary'
          }`}
          href={item.href}
        >
          {item.name}
        </a>
      );
    })}
  );
};
```

**Effort:** S (1-2 horas)

---

### 9. Unificar Espaciado de Secciones

**Problema:** Inconsistencia en padding vertical

**Solución:**
Crear utility classes en `globals.css`:

```css
@layer utilities {
  .section-padding {
    @apply py-24 md:py-32;
  }

  .section-padding-sm {
    @apply py-16 md:py-20;
  }
}
```

Aplicar en todos los componentes:

- `PainPoints.tsx`: cambiar `py-32` → `section-padding`
- `Services.tsx`: cambiar `py-24` → `section-padding`
- `Process.tsx`: cambiar `py-20` → `section-padding`

**Archivos a modificar:**

- `src/app/globals.css`
- `src/components/PainPoints.tsx`
- `src/components/Services.tsx`
- `src/components/Process.tsx`
- `src/components/Qualification.tsx`

**Effort:** S (2 horas)

---

### 10. Sistema de Tokens de Diseño

**Crear archivo centralizado:**

```typescript
// src/lib/design-tokens.ts
export const tokens = {
  colors: {
    primary: "#135bec",
    primaryDark: "#0e45b5",
    // ... resto de colores
  },
  spacing: {
    sectionY: "py-24 md:py-32",
    containerX: "px-4 sm:px-6 lg:px-8",
  },
  typography: {
    h1: "text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight",
    h2: "text-3xl md:text-4xl font-bold tracking-tight",
    // ...
  },
  radius: {
    card: "rounded-2xl",
    button: "rounded-xl",
  },
  transitions: {
    default: "transition-all duration-300",
  },
};
```

**Effort:** M (1 día de refactor)

---

### 11. Mejorar Accesibilidad

**Checklist de implementación:**

#### Labels de Formulario

```tsx
// Footer.tsx - corregir
<label htmlFor="contact-name" className="...">Nombre Colaborador</label>
<input id="contact-name" type="text" ... />
```

#### Focus States

```css
/* globals.css */
@layer utilities {
  .btn-primary {
    @apply bg-primary hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2;
  }
}
```

#### ARIA en SVG

```tsx
// Hero.tsx - agregar
<svg aria-hidden="true" className="w-full h-full" ...>
```

**Archivos a modificar:**

- `src/components/Footer.tsx`
- `src/components/Hero.tsx`
- `src/app/globals.css`
- Todos los botones/CTAs

**Effort:** M (4-5 horas)

---

## ⚡ FASE 3: Performance & Testing (P2-P3)

### 12. Optimizar Framer Motion

**Lazy loading:**

```tsx
// Donde se use motion, hacer:
import dynamic from "next/dynamic";
const motion = dynamic(
  () => import("framer-motion").then((mod) => mod.motion),
  { ssr: false },
);
```

O mejor, crear wrapper:

```tsx
// src/components/ui/MotionDiv.tsx
"use client";
import { motion } from "framer-motion";
export default motion.div;
```

**Effort:** S (2 horas)

---

### 13. Setup Testing

**Agregar:**

```json
// package.json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

**Tests prioritarios:**

- `Header.test.tsx` (navegación)
- `WhatsAppButton.test.tsx` (URL correcta)
- `Footer.test.tsx` (validación de form)

**Effort:** L (2-3 días)

---

### 14. Configurar CI/CD

**GitHub Actions workflow:**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

**Effort:** M (medio día)

---

## 🛠️ Stack Técnico Recomendado

### A Agregar

- **Resend** o **SendGrid** (emails transaccionales)
- **React Hook Form** (manejo de formularios)
- **Zod** (validación de schemas)
- **Jest + Testing Library** (testing)
- **Storybook** (opcional, para componentes)

### A Considerar Futuro

- **Vercel Analytics** (performance monitoring)
- **Sentry** (error tracking)
- **Posthog** (analytics de producto)

---

## 📊 Estimación de Effort Total

| Fase              | Effort | Días estimados |
| ----------------- | ------ | -------------- |
| Fase 0 - Hotfixes | S-M    | 2-3 días       |
| Fase 1 - SEO      | M-L    | 5-7 días       |
| Fase 2 - UX       | M      | 3-5 días       |
| Fase 3 - Testing  | L      | 5-7 días       |
| **TOTAL**         |        | **15-22 días** |

**Team recomendado:**

- 1 Senior Dev (full-time)
- 1 QA/Tester (part-time en Fase 3)

---

## ✅ Criterios de Éxito

**Fase 0:**

- [ ] Todos los links funcionan correctamente
- [ ] Formulario envía emails
- [ ] WhatsApp abre conversación
- [ ] Logo redirige a Home

**Fase 1:**

- [ ] Lighthouse SEO > 90
- [ ] Todas las páginas tienen metadata única
- [ ] Structured data válido
- [ ] Sitemap.xml funcional

**Fase 2:**

- [ ] WCAG 2.1 AA compliance
- [ ] Espaciado consistente
- [ ] Focus states visibles
- [ ] Mobile UX sin bugs

**Fase 3:**

- [ ] Test coverage > 70%
- [ ] CI/CD pipeline funcionando
- [ ] Performance score > 85
- [ ] No errores en consola

---

## 🚀 Quick Wins (Implementar YA)

Si tenés tiempo limitado, priorizar en este orden:

1. ✅ WhatsApp button funcional (30 min)
2. ✅ Logo clickeable (15 min)
3. ✅ Form backend (medio día)
4. ✅ Navegación arreglada (2 horas)
5. ✅ Metadata SEO básico (2 horas)

**Total Quick Wins:** 1 día de trabajo → impacto inmediato en conversión
