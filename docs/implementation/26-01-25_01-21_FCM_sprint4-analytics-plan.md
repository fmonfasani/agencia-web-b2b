# Plan de Implementación - Next Features

**Proyecto:** Agencia Web B2B Landing Page  
**Solicitado por:** Fede (FCM)  
**Fecha:** 25 de Enero, 2026  
**Hora:** 01:21 AM (ART)  
**Documento:** Implementation Plan v1.0

---

## Objetivo

Implementar las siguientes features prioritarias para mejorar conversión, analytics y calidad del código del sitio Agencia Web B2B.

---

## Sprint 4: Analytics & Conversion Tracking

**Duración Estimada:** 5-7 días  
**Tipo:** Full Stack  
**Fases:** Planning → Implementation → Verification

### User Review Required

> [!IMPORTANT]
> **Google Analytics 4:** ¿Tenés cuenta de GA4 ya creada o necesitás crear una nueva property?

> [!WARNING]
> **Privacy Compliance:** Este sprint requiere implementar cookie consent banner para cumplir con GDPR/LGPD.

---

## Proposed Changes

### Day 1-2: Google Analytics 4 Integration

**Tipo:** Frontend + DevOps  
**Complejidad:** Media

#### [MODIFY] [layout.tsx](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/src/app/layout.tsx)

Integrar Google Tag Manager en el layout principal:

```tsx
// Add GTM script
<Script
  id="gtm-script"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','GTM-XXXXXXX');
    `,
  }}
/>
```

#### [NEW] [src/lib/analytics.ts](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/src/lib/analytics.ts)

Helper functions para tracking de eventos:

```typescript
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>,
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, eventParams);
  }
};

export const trackPageView = (url: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", "GA_MEASUREMENT_ID", {
      page_path: url,
    });
  }
};

// Track form submissions
export const trackFormSubmit = (formName: string) => {
  trackEvent("form_submit", {
    form_name: formName,
  });
};

// Track CTA clicks
export const trackCTAClick = (ctaLocation: string) => {
  trackEvent("cta_click", {
    location: ctaLocation,
  });
};
```

---

### Day 3: Conversion Tracking Implementation

**Tipo:** Frontend  
**Complejidad:** Baja

#### [MODIFY] [Footer.tsx](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/src/components/Footer.tsx)

Añadir tracking en formulario de contacto:

```tsx
import { trackFormSubmit } from "@/lib/analytics";

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      setShowSuccess(true);
      // Track successful submission
      trackFormSubmit("footer_contact_form");
    }
  } catch (error) {
    console.error(error);
  } finally {
    setIsLoading(false);
  }
};
```

#### [MODIFY] [Header.tsx](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/src/components/Header.tsx)

Track CTA clicks:

```tsx
import { trackCTAClick } from "@/lib/analytics";

const handleCTAClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  trackCTAClick("header");
  // existing navigation logic...
};
```

---

### Day 4: Cookie Consent Banner

**Tipo:** Frontend  
**Complejidad:** Media

#### [NEW] [src/components/CookieConsent.tsx](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/src/components/CookieConsent.tsx)

Componente de consentimiento GDPR-compliant:

```tsx
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "true");
    setShow(false);
    // Initialize analytics
    if (window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
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
          className="fixed bottom-0 left-0 right-0 z-[200] bg-white border-t border-slate-200 p-6 shadow-2xl"
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-secondary">
              Usamos cookies para mejorar tu experiencia. Al continuar
              navegando, aceptás nuestra{" "}
              <a href="/privacy" className="text-primary underline">
                Política de Privacidad
              </a>
              .
            </p>
            <button
              onClick={accept}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all"
            >
              Aceptar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### Day 5-6: E2E Tests in CI

**Tipo:** DevOps + Testing  
**Complejidad:** Media

#### [MODIFY] [.github/workflows/ci.yml](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/.github/workflows/ci.yml)

Añadir job de Playwright:

```yaml
e2e-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: "20"
        cache: "npm"
    - run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npm run test:e2e
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

---

### Day 7: Lighthouse CI

**Tipo:** DevOps  
**Complejidad:** Media

#### [NEW] [lighthouserc.json](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/lighthouserc.json)

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000", "http://localhost:3000/pricing"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

#### [MODIFY] [.github/workflows/ci.yml](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/.github/workflows/ci.yml)

Añadir Lighthouse job:

```yaml
lighthouse:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: "20"
        cache: "npm"
    - run: npm ci
    - run: npm run build
    - run: npm run start &
    - run: sleep 5
    - run: npm install -g @lhci/cli
    - run: lhci autorun
```

---

## Verification Plan

### Automated Tests

```bash
# Verificar analytics en dev tools
npm run dev
# Abrir http://localhost:3000
# Comprobar Network tab: gtag requests

# E2E en CI
git push origin feature/analytics
# Verificar GitHub Actions → e2e-tests job

# Lighthouse CI
# Verificar job en GitHub Actions
# Review métricas en Lighthouse report
```

### Manual Verification

1. **Google Analytics Real-Time**
   - Navegar por el sitio
   - Verificar eventos en GA4 real-time dashboard

2. **Cookie Consent**
   - Limpiar localStorage
   - Recargar página
   - Verificar banner aparece
   - Aceptar y verificar que no vuelve a aparecer

3. **Conversion Tracking**
   - Enviar formulario
   - Verificar evento `form_submit` en GA4

---

## Dependencies to Install

```bash
# Analytics
npm install -D @types/gtag.js

# Lighthouse CI
npm install -D @lhci/cli
```

---

## Estimated Timeline

| Task                       | Días | Tipo              |
| -------------------------- | ---- | ----------------- |
| **Google Analytics Setup** | 2    | Frontend + DevOps |
| **Conversion Tracking**    | 1    | Frontend          |
| **Cookie Consent**         | 1    | Frontend          |
| **E2E in CI**              | 2    | DevOps + Testing  |
| **Lighthouse CI**          | 1    | DevOps            |

**Total:** 7 días de desarrollo

---

## Post-Implementation Notes

Este sprint establece la base de **data-driven decision making** para la agencia. Una vez implementado, se podrá:

- Medir tasas de conversión reales
- Identificar cuellos de botella en el funnel
- A/B testing basado en datos
- Optimización continua de CRO

---

**Documento generado:** 26-01-25 01:21 AM (ART)  
**Autor:** Antigravity AI para Fede (FCM)  
**Versión:** 1.0
