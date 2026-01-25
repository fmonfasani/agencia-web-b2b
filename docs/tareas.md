# 📝 Tareas a Realizar - Agencia Web B2B

**Generado:** 25 de Enero, 2026  
**Total de tareas:** 42  
**Esfuerzo total estimado:** 15-22 días

---

## 🔥 P0 - BLOCKER (Críticos - Deben resolverse YA)

### 🐛 Bug Fix

- [ ] **[BUG-001]** Arreglar navegación de hash links desde `/pricing`
  - **Archivo:** `src/components/Header.tsx` (líneas 22-36, 61-74)
  - **Descripción:** Implementar función `handleNavigation` que detecte si estamos en otra página y redirija correctamente
  - **Effort:** S (2-3 horas)
  - **Bloqueador para:** Navegación básica funcional

- [ ] **[BUG-002]** Botón WhatsApp no funciona
  - **Archivos:**
    - `src/app/page.tsx` (línea 26)
    - `src/app/pricing/page.tsx` (línea 24)
  - **Descripción:** `href="#"` debe ser `href="https://wa.me/..."`
  - **Effort:** XS (30 min)
  - **Bloqueador para:** CTA flotante más visible

- [ ] **[BUG-003]** Header CTA "Agendar Llamada" apunta a `#contacto` inexistente en `/pricing`
  - **Archivo:** `src/components/Header.tsx` (línea 41)
  - **Descripción:** CTA debe scrollear al Footer o abrir modal
  - **Effort:** S (1 hora)
  - **Bloqueador para:** Conversión desde Pricing

- [ ] **[BUG-004]** Logo no es clickeable
  - **Archivo:** `src/components/Header.tsx` (líneas 13-20)
  - **Descripción:** Wrap logo en `<Link href="/">`
  - **Effort:** XS (15 min)
  - **Bloqueador para:** UX básica de navegación

---

## 🔴 P1 - HIGH (Importantes - Resolver en Sprint 1)

### ✨ Feature

- [ ] **[FEAT-001]** Implementar backend de formulario de contacto
  - **Archivos:**
    - `src/app/api/contact/route.ts` (NUEVO)
    - `src/components/Footer.tsx` (líneas 64-101)
    - `.env.local` (NUEVO)
    - `package.json` (agregar `nodemailer` o `resend`)
  - **Descripción:** API route que envíe emails con SMTP o servicio externo
  - **Effort:** M (1 día)
  - **Dependencias:** Credenciales SMTP del cliente

- [ ] **[FEAT-002]** Crear componente `WhatsAppButton` reutilizable
  - **Archivos:**
    - `src/components/WhatsAppButton.tsx` (NUEVO)
    - `src/app/page.tsx` (reemplazar líneas 22-33)
    - `src/app/pricing/page.tsx` (reemplazar líneas 20-31)
  - **Descripción:** Component con props `phoneNumber` y `message`
  - **Effort:** S (1 hora)
  - **Elimina:** Duplicación de código

- [ ] **[FEAT-003]** Indicador de página activa en navegación
  - **Archivo:** `src/components/Header.tsx`
  - **Descripción:** Usar `usePathname()` para resaltar link activo
  - **Effort:** S (2 horas)
  - **Mejora:** UX de orientación

### 🎨 SEO

- [ ] **[SEO-001]** Metadata específica por página
  - **Archivos:**
    - `src/app/page.tsx` (mover metadata desde layout)
    - `src/app/pricing/page.tsx` (agregar export metadata)
    - `src/app/layout.tsx` (mantener solo global)
  - **Descripción:** Cada página con title/description únicos
  - **Effort:** S (2 horas)
  - **Impacto:** Google rankings

- [ ] **[SEO-002]** Implementar Open Graph tags
  - **Archivos:**
    - `src/app/page.tsx`
    - `src/app/pricing/page.tsx`
    - `src/app/opengraph-image.tsx` (NUEVO)
  - **Descripción:** OG tags para preview en redes sociales
  - **Effort:** M (3 horas)
  - **Dependencias:** Diseño de imagen OG

- [ ] **[SEO-003]** Crear sitemap.xml dinámico
  - **Archivo:** `src/app/sitemap.ts` (NUEVO)
  - **Descripción:** Sitemap con todas las rutas
  - **Effort:** S (1 hora)

- [ ] **[SEO-004]** Configurar robots.txt
  - **Archivo:** `public/robots.txt` (NUEVO)
  - **Descripción:** Permitir crawling de todas las páginas
  - **Effort:** XS (15 min)

- [ ] **[SEO-005]** Structured Data JSON-LD
  - **Archivo:** `src/components/StructuredData.tsx` (NUEVO)
  - **Descripción:** Schema.org markup para ProfessionalService
  - **Effort:** S (2 horas)

- [ ] **[SEO-006]** Favicon personalizado
  - **Archivos:**
    - `src/app/favicon.ico` (reemplazar)
    - `src/app/icon.png` (NUEVO)
    - `src/app/apple-icon.png` (NUEVO)
  - **Descripción:** Usar logo real de la agencia
  - **Effort:** XS (30 min)
  - **Dependencias:** Logo en formato correcto

### ♿ A11y (Accesibilidad)

- [ ] **[A11Y-001]** Asociar labels con inputs en formulario
  - **Archivo:** `src/components/Footer.tsx` (líneas 67-95)
  - **Descripción:** Agregar `htmlFor` en labels e `id` en inputs
  - **Effort:** S (1 hora)
  - **WCAG:** 3.3.2 Labels or Instructions (A)

- [ ] **[A11Y-002]** Focus states visibles en CTAs
  - **Archivos:**
    - `src/app/globals.css`
    - `src/components/Header.tsx`
    - `src/components/Services.tsx`
    - `src/components/pricing/PricingTable.tsx`
  - **Descripción:** Agregar `focus-visible:ring-2` en botones
  - **Effort:** M (3 horas)
  - **WCAG:** 2.4.7 Focus Visible (AA)

- [ ] **[A11Y-003]** ARIA en elementos decorativos
  - **Archivos:**
    - `src/components/Hero.tsx` (línea 91)
    - `src/components/pricing/PricingCTA.tsx`
  - **Descripción:** Agregar `aria-hidden="true"` en SVGs decorativos
  - **Effort:** S (30 min)
  - **WCAG:** 1.1.1 Non-text Content (A)

- [ ] **[A11Y-004]** Mejorar contraste de textos secundarios
  - **Archivos:**
    - `src/app/globals.css` (actualizar token `--color-text-secondary`)
    - Verificar componentes que usan `text-text-secondary`
  - **Descripción:** Color actual (#64748b) puede fallar en AA
  - **Effort:** M (2 horas)
  - **WCAG:** 1.4.3 Contrast Minimum (AA)
  - **Testing:** Usar herramienta de contraste

---

## 🟡 P2 - MEDIUM (Mejoras - Sprint 2)

### 🔧 Refactor

- [ ] **[REF-001]** Unificar espaciado de secciones
  - **Archivos:**
    - `src/app/globals.css` (crear `.section-padding`)
    - `src/components/PainPoints.tsx`
    - `src/components/Services.tsx`
    - `src/components/Process.tsx`
    - `src/components/Qualification.tsx`
  - **Descripción:** Reemplazar todos los `py-X` por clase utility
  - **Effort:** S (2 horas)
  - **Mejora:** Consistencia visual

- [ ] **[REF-002]** Crear sistema de tokens de diseño
  - **Archivo:** `src/lib/design-tokens.ts` (NUEVO)
  - **Descripción:** Centralizar colores, spacing, typography
  - **Effort:** M (1 día)
  - **Beneficio:** Mantenibilidad

- [ ] **[REF-003]** Estandarizar redondeos de bordes
  - **Archivos:** Todos los componentes
  - **Descripción:** Usar solo `rounded-xl`, `rounded-2xl`, `rounded-3xl`
  - **Effort:** S (2 horas)

- [ ] **[REF-004]** Estandarizar pesos de iconos (strokeWidth)
  - **Archivos:** Todos los componentes con Lucide icons
  - **Descripción:** Usar consistentemente `strokeWidth={2.5}`
  - **Effort:** S (1 hora)

- [ ] **[REF-005]** Extraer Footer a componente singleton
  - **Archivos:**
    - `src/components/Footer.tsx` (optimizar)
    - `src/app/page.tsx`
    - `src/app/pricing/page.tsx`
  - **Descripción:** Si se cambia el email, no tener que actualizar 2 veces
  - **Effort:** XS (30 min)

### ⚡ Performance

- [ ] **[PERF-001]** Lazy load Framer Motion
  - **Archivos:**
    - `src/components/Hero.tsx`
    - `src/components/PainPoints.tsx`
    - Todos los que usan `motion`
  - **Descripción:** Dynamic import o crear wrapper component
  - **Effort:** M (4 horas)
  - **Ganancia:** -40KB bundle inicial

- [ ] **[PERF-002]** Optimizar importación de Lucide icons
  - **Archivos:** Todos
  - **Descripción:** Importar específicos en lugar de árbol completo
  - **Effort:** S (2 horas)

- [ ] **[PERF-003]** Configurar HTTP caching headers
  - **Archivo:** `next.config.ts`
  - **Descripción:** Cache de assets estáticos
  - **Effort:** S (1 hora)

- [ ] **[PERF-004]** Optimizar SVG del Hero
  - **Archivo:** `src/components/Hero.tsx` (líneas 91-135)
  - **Descripción:** Minificar o convertir a imagen estática
  - **Effort:** S (2 horas)

### 🎨 UX

- [ ] **[UX-001]** Breadcrumb o indicador de ubicación
  - **Archivo:** Nuevo componente o en `Header.tsx`
  - **Descripción:** Mostrar "Home" o "Pricing" visualmente
  - **Effort:** S (2 horas)

- [ ] **[UX-002]** Smooth scroll entre páginas
  - **Archivo:** `src/components/Header.tsx`
  - **Descripción:** Implementar router.push con scroll
  - **Effort:** M (3 horas)

- [ ] **[UX-003]** Loader/spinner durante navegación
  - **Archivos:**
    - `src/app/loading.tsx` (NUEVO)
    - `src/app/pricing/loading.tsx` (NUEVO)
  - **Descripción:** Loading state entre páginas
  - **Effort:** S (1 hora)

- [ ] **[UX-004]** Página 404 personalizada
  - **Archivo:** `src/app/not-found.tsx` (NUEVO)
  - **Descripción:** Error page con link a Home
  - **Effort:** S (2 horas)

- [ ] **[UX-005]** Consistencia en capitalización de CTAs
  - **Archivos:** Todos los componentes
  - **Descripción:** Decidir estándar ("Agendar llamada" vs "Agendar Llamada")
  - **Effort:** XS (30 min)

---

## 🟢 P3 - LOW (Deseable - Backlog)

### 🧪 Testing

- [ ] **[TEST-001]** Setup Jest + Testing Library
  - **Archivos:**
    - `jest.config.js` (NUEVO)
    - `jest.setup.js` (NUEVO)
    - `package.json` (agregar dependencies)
  - **Descripción:** Configuración base de testing
  - **Effort:** M (medio día)

- [ ] **[TEST-002]** Tests de Header (navegación)
  - **Archivo:** `__tests__/components/Header.test.tsx` (NUEVO)
  - **Descripción:** Testear todos los links y mobile menu
  - **Effort:** M (4 horas)

- [ ] **[TEST-003]** Tests de WhatsApp Button
  - **Archivo:** `__tests__/components/WhatsAppButton.test.tsx` (NUEVO)
  - **Descripción:** Verificar URL correcta
  - **Effort:** S (1 hora)

- [ ] **[TEST-004]** Tests de formulario (validación)
  - **Archivo:** `__tests__/components/Footer.test.tsx` (NUEVO)
  - **Descripción:** Verificar validaciones de campos
  - **Effort:** M (3 horas)

- [ ] **[TEST-005]** Integration tests de API route
  - **Archivo:** `__tests__/api/contact.test.ts` (NUEVO)
  - **Descripción:** Testear endpoint de contacto
  - **Effort:** M (4 horas)

### 🔒 DevOps

- [ ] **[OPS-001]** Configurar GitHub Actions CI/CD
  - **Archivo:** `.github/workflows/ci.yml` (NUEVO)
  - **Descripción:** Lint → Build → Test en cada PR
  - **Effort:** M (medio día)

- [ ] **[OPS-002]** Pre-commit hooks con Husky
  - **Archivos:**
    - `.husky/pre-commit` (NUEVO)
    - `package.json`
  - **Descripción:** Correr lint y format antes de commit
  - **Effort:** S (2 horas)

- [ ] **[OPS-003]** Prettier configuration
  - **Archivos:**
    - `.prettierrc` (NUEVO)
    - `.prettierignore` (NUEVO)
  - **Descripción:** Formateo automático de código
  - **Effort:** S (1 hora)

### 📊 Analytics & Monitoring

- [ ] **[MON-001]** Integrar Vercel Analytics
  - **Archivo:** `src/app/layout.tsx`
  - **Descripción:** Analytics script
  - **Effort:** XS (15 min)

- [ ] **[MON-002]** Integrar Google Analytics 4
  - **Archivos:**
    - `src/lib/gtag.ts` (NUEVO)
    - `src/app/layout.tsx`
  - **Descripción:** Tracking de conversiones
  - **Effort:** S (2 horas)

- [ ] **[MON-003]** Setup Sentry (error tracking)
  - **Archivos:**
    - `sentry.client.config.ts` (NUEVO)
    - `sentry.server.config.ts` (NUEVO)
    - `next.config.ts`
  - **Descripción:** Monitoreo de errores en producción
  - **Effort:** M (4 horas)

### 🌐 I18n (Internacionalización)

- [ ] **[I18N-001]** Setup Next-Intl
  - **Archivos:** Múltiples
  - **Descripción:** Preparar para multi-idioma
  - **Effort:** L (2-3 días)
  - **Nota:** Solo si se requiere expandir a otros países

---

## 📋 Resumen por Categoría

| Categoría      | P0    | P1     | P2     | P3     | Total  |
| -------------- | ----- | ------ | ------ | ------ | ------ |
| 🐛 Bug Fix     | 4     | 0      | 0      | 0      | **4**  |
| ✨ Feature     | 0     | 3      | 0      | 0      | **3**  |
| 🎨 SEO         | 0     | 6      | 0      | 0      | **6**  |
| ♿ A11y        | 0     | 4      | 0      | 0      | **4**  |
| 🔧 Refactor    | 0     | 0      | 5      | 0      | **5**  |
| ⚡ Performance | 0     | 0      | 4      | 0      | **4**  |
| 🎨 UX          | 0     | 0      | 5      | 0      | **5**  |
| 🧪 Testing     | 0     | 0      | 0      | 5      | **5**  |
| 🔒 DevOps      | 0     | 0      | 0      | 3      | **3**  |
| 📊 Monitoring  | 0     | 0      | 0      | 3      | **3**  |
| **TOTAL**      | **4** | **13** | **14** | **11** | **42** |

---

## 🚀 Sprint Planning Sugerido

### Sprint 0 (Hotfix) - 2-3 días

- [ ] Todas las tareas P0 (4 tareas)
- **Objetivo:** Web funcional básica

### Sprint 1 - 1 semana

- [ ] FEAT-001, FEAT-002, FEAT-003
- [ ] SEO-001 a SEO-006
- [ ] A11Y-001, A11Y-002
- **Objetivo:** SEO + Conversión

### Sprint 2 - 1 semana

- [ ] REF-001 a REF-005
- [ ] PERF-001, PERF-002
- [ ] UX-001 a UX-005
- [ ] A11Y-003, A11Y-004
- **Objetivo:** Polish + Performance

### Sprint 3 (Opcional) - 1 semana

- [ ] TEST-001 a TEST-005
- [ ] OPS-001 a OPS-003
- [ ] MON-001 a MON-003
- **Objetivo:** Quality + Monitoring

---

## ✅ Definition of Done

Cada tarea se considera completa cuando:

- [ ] Código implementado y committeado
- [ ] Revisado por par (si hay equipo)
- [ ] Testeado manualmente en dev
- [ ] No rompe build
- [ ] Lighthouse score no disminuye
- [ ] Documentado si es feature nueva

---

## 📌 Notas Importantes

1. **P0 debe resolverse ANTES de lanzamiento**
2. **P1 crítico para conversión efectiva**
3. **P2 y P3 pueden ir a backlog post-launch**
4. **Testing (P3) puede ejecutarse en paralelo con desarrollo**

**Última actualización:** 25 de Enero, 2026
