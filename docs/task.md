# Task Checklist - Agencia Web B2B

## Sprint P0: Hotfix Crítico ✅

- [x] [BUG-004] Logo clickeable
- [x] [BUG-002] Botón WhatsApp funcional
- [x] [BUG-003] Header CTA con navegación inteligente
- [x] [BUG-001] Navegación de hash links multi-página

## Sprint 1: Foundation & SEO ✅

- [x] [SEO-001] Metadata específica por página
- [x] [SEO-002] OpenGraph y Twitter Cards
- [x] [SEO-003] Sitemap dinámico
- [x] [SEO-004] Robots.txt
- [x] [SEO-005] Structured Data (JSON-LD)
- [x] [FEAT-001] API de contacto funcional
- [x] [A11Y-001] Labels asociados a inputs
- [x] [A11Y-002] Contraste mejorado WCAG AA
- [x] [A11Y-003] SVGs decorativos ocultos
- [x] [A11Y-004] Focus rings visibles
- [x] [FEAT-003] Indicador de página activa

## Sprint 2: UX & Conversión Refinado ✅

- [x] [REF-001] Sistema de spacing unificado
- [x] [REF-002] Tokens de diseño centralizados
- [x] [REF-003] Estandarización de bordes (rounded-3xl/2xl)
- [x] [REF-004] StrokeWidth consistente en iconos
- [x] [UX-003] Loading state global
- [x] [UX-004] Página 404 personalizada
- [x] [UX-005] Capitalización estándar en CTAs

## Sprint 3: Testing & Quality Assurance 🔧

### Configuración Base

- [/] [TEST-001] Configurar Jest + React Testing Library
  - [/] Instalar dependencias
  - [ ] Configurar jest.config.js
  - [ ] Setup archivo de configuración de tests
  - [ ] Crear tests de ejemplo

### Tests Unitarios

- [ ] [TEST-002] Tests de componentes críticos
  - [ ] Header navigation tests
  - [ ] Contact form validation tests
  - [ ] WhatsAppButton tests

### Tests E2E

- [ ] [TEST-003] Configurar Playwright
  - [ ] Instalar Playwright
  - [ ] Configurar playwright.config.ts
  - [ ] Scripts de ejecución

- [ ] [TEST-004] Tests de flujos principales
  - [ ] Navegación multi-página
  - [ ] Envío de formulario
  - [ ] Responsive design

### Calidad de Código

- [ ] [TEST-005] Pre-commit hooks con Husky
  - [ ] Configurar Husky
  - [ ] Lint-staged para formateo
  - [ ] Validación pre-commit

### CI/CD

- [ ] [TEST-006] GitHub Actions pipeline
  - [ ] Workflow de tests
  - [ ] Build verification
  - [ ] Type checking
