# Task Breakdown - Sprint 4 Implementation

**Proyecto:** Agencia Web B2B Landing Page  
**Solicitado por:** Fede (FCM)  
**Fecha:** 25 de Enero, 2026  
**Hora:** 01:21 AM (ART)  
**Sprint:** Sprint 4 - Analytics & Conversion  
**Duración:** 7 días

---

## Sprint Overview

| Información         | Detalle                                                              |
| ------------------- | -------------------------------------------------------------------- |
| **Sprint Goal**     | Implementar Google Analytics 4, conversion tracking, y Lighthouse CI |
| **Sprint Duration** | 7 días laborables                                                    |
| **Team Size**       | 1 developer (Full Stack)                                             |
| **Priority**        | Alta                                                                 |
| **Dependencies**    | Google Analytics account, GTM setup                                  |

---

## Day 1 - Monday

### Type: **Frontend + DevOps**

### Phase: **Planning → Implementation**

#### Morning Tasks (4 hours)

- [ ] **[SETUP]** Crear Google Analytics 4 property
  - Crear cuenta GA4 si no existe
  - Configurar property para el sitio
  - Obtener Measurement ID (G-XXXXXXXXXX)
  - Configurar Google Tag Manager
  - **Deliverable:** GTM ID y GA4 Measurement ID

- [ ] **[CODE]** Setup inicial de analytics
  - Crear `.env.local` con variables de entorno
  - Instalar dependencias: `npm install -D @types/gtag.js`
  - Crear archivo `src/lib/analytics.ts`
  - **Files Modified:** `.env.local`, `package.json`

#### Afternoon Tasks (4 hours)

- [ ] **[CODE]** Integrar GTM en layout principal
  - Modificar `src/app/layout.tsx`
  - Añadir GTM script en `<head>`
  - Añadir GTM noscript en `<body>`
  - Verificar en dev tools que se carga correctamente
  - **Files Modified:** `src/app/layout.tsx`

- [ ] **[TEST]** Verificación local
  - Iniciar dev server: `npm run dev`
  - Abrir Network tab en DevTools
  - Comprobar requests a `google-analytics.com`
  - **Deliverable:** Screenshot de network tab con requests

---

## Day 2 - Tuesday

### Type: **Frontend**

### Phase: **Implementation**

#### Morning Tasks (4 hours)

- [ ] **[CODE]** Implementar helper functions de analytics
  - Completar `src/lib/analytics.ts`
  - Añadir `trackEvent()`
  - Añadir `trackPageView()`
  - Añadir `trackFormSubmit()`
  - Añadir `trackCTAClick()`
  - **Files Modified:** `src/lib/analytics.ts`

- [ ] **[CODE]** Track page views automático
  - Crear middleware para tracking de páginas
  - Configurar tracking en cambios de ruta
  - **Files Modified:** `src/app/layout.tsx`

#### Afternoon Tasks (4 hours)

- [ ] **[CODE]** Implementar tracking en Header
  - Modificar `src/components/Header.tsx`
  - Añadir tracking en CTA "Agendar llamada"
  - Añadir tracking en nav items
  - **Files Modified:** `src/components/Header.tsx`

- [ ] **[CODE]** Implementar tracking en Hero
  - Modificar `src/components/Hero.tsx`
  - Track todos los CTAs
  - **Files Modified:** `src/components/Hero.tsx`

- [ ] **[TEST]** Verificar eventos en GA4
  - Abrir GA4 Real-Time dashboard
  - Hacer clicks en CTAs
  - Verificar que eventos aparecen en GA4
  - **Deliverable:** Screenshot de eventos en GA4

---

## Day 3 - Wednesday

### Type: **Frontend**

### Phase: **Implementation**

#### Morning Tasks (4 hours)

- [ ] **[CODE]** Tracking en formulario de contacto
  - Modificar `src/components/Footer.tsx`
  - Añadir `trackFormSubmit()` on success
  - Añadir custom parameters (form_name, source)
  - **Files Modified:** `src/components/Footer.tsx`

- [ ] **[CODE]** Tracking en página de Pricing
  - Modificar `src/app/pricing/page.tsx`
  - Track clicks en planes
  - Track scroll depth
  - **Files Modified:** `src/app/pricing/page.tsx`

#### Afternoon Tasks (4 hours)

- [ ] **[CODE]** Crear componente Cookie Consent
  - Crear `src/components/CookieConsent.tsx`
  - Implementar UI con Framer Motion
  - Implementar localStorage persistence
  - Añadir lógica de consent management
  - **Files Created:** `src/components/CookieConsent.tsx`

- [ ] **[CODE]** Integrar Cookie Consent en layout
  - Modificar `src/app/layout.tsx`
  - Añadir `<CookieConsent />` component
  - **Files Modified:** `src/app/layout.tsx`

- [ ] **[TEST]** Test manual de cookie consent
  - Limpiar localStorage
  - Reload página
  - Verificar banner aparece
  - Aceptar y verificar persistence
  - **Deliverable:** Video demo de cookie consent

---

## Day 4 - Thursday

### Type: **DevOps**

### Phase: **Implementation**

#### Morning Tasks (4 hours)

- [ ] **[SETUP]** Configurar Playwright en CI
  - Modificar `.github/workflows/ci.yml`
  - Añadir job de E2E tests
  - Configurar matrix de navegadores (chromium, firefox, webkit)
  - **Files Modified:** `.github/workflows/ci.yml`

- [ ] **[CODE]** Añadir upload de artifacts
  - Configurar upload de screenshots
  - Configurar upload de videos
  - Configurar upload de reports HTML
  - **Files Modified:** `.github/workflows/ci.yml`

#### Afternoon Tasks (4 hours)

- [ ] **[TEST]** Test pipeline en GitHub Actions
  - Push changes to feature branch
  - Crear Pull Request
  - Verificar que E2E job corre
  - Review artifacts generados
  - **Deliverable:** Link a successful GitHub Actions run

- [ ] **[CODE]** Ajustes en tests según resultados
  - Fix any flaky tests identificados
  - Añadir retries si es necesario
  - **Files Modified:** `e2e/*.spec.ts`

---

## Day 5 - Friday

### Type: **DevOps**

### Phase: **Implementation**

#### Morning Tasks (4 hours)

- [ ] **[SETUP]** Instalar Lighthouse CI
  - Run: `npm install -D @lhci/cli`
  - Crear `lighthouserc.json` config
  - Configurar budgets de performance
  - **Files Created:** `lighthouserc.json`

- [ ] **[CODE]** Añadir Lighthouse job a CI
  - Modificar `.github/workflows/ci.yml`
  - Añadir job `lighthouse`
  - Configurar para correr en build
  - **Files Modified:** `.github/workflows/ci.yml`

#### Afternoon Tasks (4 hours)

- [ ] **[TEST]** Test local de Lighthouse
  - Build production: `npm run build`
  - Start server: `npm run start`
  - Run Lighthouse: `npm run lighthouse`
  - Review report
  - **Deliverable:** Lighthouse HTML report

- [ ] **[CODE]** Optimizaciones basadas en Lighthouse
  - Fix issues identificados
  - Improve performance score
  - **Files Modified:** Various

---

## Day 6 - Saturday (Optional/Catch-up day)

### Type: **Full Stack**

### Phase: **Integration Testing**

#### Tasks (4-6 hours)

- [ ] **[TEST]** Integration testing completo
  - Test analytics end-to-end
  - Test cookie consent flow
  - Test E2E en CI
  - Test Lighthouse scores

- [ ] **[DOC]** Actualizar documentación
  - Crear docs de analytics setup
  - Documentar eventos tracked
  - Crear guide para GA4 dashboard
  - **Files Created:** `docs/analytics-setup.md`

- [ ] **[FIX]** Bug fixes
  - Resolver cualquier issue pendiente
  - Code cleanup
  - **Files Modified:** Various

---

## Day 7 - Monday (Next week)

### Type: **Full Stack + DevOps**

### Phase: **Verification → Deployment**

#### Morning Tasks (4 hours)

- [ ] **[TEST]** QA final completo
  - Test en staging
  - Test cross-browser
  - Test mobile
  - Test analytics reporting
  - **Deliverable:** QA report

- [ ] **[CODE]** Final adjustments
  - Performance tuning
  - UI polish
  - **Files Modified:** Various

#### Afternoon Tasks (4 hours)

- [ ] **[DEPLOY]** Production deployment
  - Merge to main
  - Deploy to production
  - Monitor deployment
  - **Deliverable:** Production URL

- [ ] **[VERIFY]** Post-deployment verification
  - Smoke tests en production
  - Verificar GA4 está recibiendo datos
  - Check Lighthouse scores
  - Monitor error logs
  - **Deliverable:** Post-deployment checklist

- [ ] **[DOC]** Create walkthrough document
  - Document what was accomplished
  - Include screenshots
  - Metrics baseline
  - **Files Created:** `docs/analysis/sprint4-walkthrough.md`

---

## Task Summary by Type

###Backend Tasks

- 0 tasks

### Frontend Tasks

- 12 tasks (Days 1-3)

### Full Stack Tasks

- 4 tasks (Days 6-7)

### DevOps Tasks

- 8 tasks (Days 4-5)

---

## Critical Path

```
Day 1: GA4 Setup → GTM Integration
Day 2: Analytics Helpers → Event Tracking
Day 3: Form Tracking → Cookie Consent
Day 4: E2E in CI → Playwright
Day 5: Lighthouse CI → Performance
Day 7: Final QA → Deployment
```

---

## Dependencies & Blockers

### External Dependencies

- ✅ Google Analytics 4 account access
- ⚠️ GTM container ID (required before Day 1)
- ✅ GitHub repository access
- ✅ Deployment permissions

### Technical Dependencies

- ✅ Next.js 15 already configured
- ✅ GitHub Actions already setup
- ✅ Playwright already installed
- ⚠️ Lighthouse CI needs installation

---

## Success Criteria

Sprint será considerado exitoso si:

- ✅ Google Analytics 4 está rastreando correctamente
- ✅ Todos los eventos principales están siendo tracked
- ✅ Cookie consent banner funciona correctamente
- ✅ E2E tests corren en CI sin fallar
- ✅ Lighthouse score: Performance >90, A11y >90, SEO >90
- ✅ Zero critical bugs en production

---

## Risk Mitigation

| Risk                     | Probability | Impact | Mitigation                               |
| ------------------------ | ----------- | ------ | ---------------------------------------- |
| GA4 setup delays         | Low         | Medium | Start Day 1 morning, escalate if blocked |
| Flaky E2E tests          | Medium      | Medium | Add retries, increase timeouts           |
| Lighthouse score drops   | Low         | Low    | Implement budgets, monitor continuously  |
| Cookie consent UX issues | Low         | Medium | User testing on Day 3                    |

---

## Daily Standup Format

**What did I do yesterday?**

- List completed tasks from previous day

**What will I do today?**

- List planned tasks for today

**Any blockers?**

- List any blockers or dependencies

---

**Documento generado:** 26-01-25 01:21 AM (ART)  
**Autor:** Antigravity AI para Fede (FCM)  
**Sprint Manager:** FCM  
**Versión:** 1.0
