# Sprint 3: Testing & Quality Assurance - Implementation Plan

Configuración completa de infraestructura de testing, herramientas de calidad de código y pipeline de CI/CD para asegurar la estabilidad y mantenibilidad del proyecto a largo plazo.

## User Review Required

> [!IMPORTANT]
> **Decisión de Alcance:** Este sprint se enfoca en configurar la **base de testing** con ejemplos funcionales. Los tests exhaustivos de todos los componentes serían un proyecto continuo que excede el alcance inicial. ¿Estás de acuerdo con comenzar con tests de los componentes más críticos (Header, Contact Form, WhatsApp Button)?

> [!WARNING]
> **Playwright vs Cypress:** Propongo usar Playwright para E2E tests por su mejor soporte para Next.js 15 y testing multi-navegador. Si preferís Cypress, puedo ajustar el plan.

## Proposed Changes

### Testing Infrastructure

#### [NEW] [jest.config.js](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/jest.config.js)

Configuración de Jest con soporte para:

- TypeScript transformations con `ts-jest`
- Módulos CSS/SCSS mocked
- Path aliases (`@/...`)
- Coverage reports configurados
- Next.js environment setup

```javascript
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.tsx",
  ],
};

module.exports = createJestConfig(customJestConfig);
```

#### [NEW] [jest.setup.js](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/jest.setup.js)

Setup global de React Testing Library:

- Importar `@testing-library/jest-dom` para matchers extendidos
- Mock de `next/navigation` hooks
- Configuración de timeouts

---

### Unit Tests - Componentes Críticos

#### [NEW] [src/components/**tests**/Header.test.tsx](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/src/components/__tests__/Header.test.tsx)

Tests del componente `Header`:

- ✅ Renderiza correctamente el logo
- ✅ Logo es clickeable y redirige a `/`
- ✅ Menú mobile se abre/cierra
- ✅ Navegación resalta la página activa
- ✅ CTA "Agendar llamada" dispara scroll o navegación según contexto

#### [NEW] [src/components/**tests**/WhatsAppButton.test.tsx](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/src/components/__tests__/WhatsAppButton.test.tsx)

Tests del botón de WhatsApp:

- ✅ Genera URL correcta con número formateado
- ✅ Mensaje URL-encoded
- ✅ Link tiene atributos de seguridad (`rel="noopener noreferrer"`)
- ✅ Abre en nueva pestaña

#### [NEW] [src/components/**tests**/Footer.test.tsx](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/src/components/__tests__/Footer.test.tsx)

Tests del formulario de contacto:

- ✅ Valida campos requeridos
- ✅ Muestra error si faltan datos
- ✅ Llama a la API con datos correctos
- ✅ Muestra mensaje de éxito/error

---

### E2E Tests - Playwright

#### [NEW] [playwright.config.ts](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/playwright.config.ts)

Configuración de Playwright:

- Base URL configurada
- Multiple browsers (Chromium, Firefox, Safari)
- Screenshots on failure
- Video recording opcional

#### [NEW] [e2e/navigation.spec.ts](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/e2e/navigation.spec.ts)

Tests de navegación:

- ✅ Navegación desde Home → Pricing → Home
- ✅ Links de hash (`/#servicios`) funcionan correctamente
- ✅ Logo redirige a home desde cualquier página
- ✅ Mobile menu funciona

#### [NEW] [e2e/contact-form.spec.ts](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/e2e/contact-form.spec.ts)

Tests del flujo de contacto:

- ✅ Formulario se muestra correctamente
- ✅ Validación funciona
- ✅ Envío exitoso muestra feedback
- ✅ WhatsApp button abre en nueva pestaña

---

### Code Quality - Husky & Lint-staged

#### [MODIFY] [package.json](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/package.json)

Agregar scripts y configuración:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

#### [NEW] [.husky/pre-commit](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/.husky/pre-commit)

Hook pre-commit:

- Ejecutar `lint-staged` para formateo automático
- Ejecutar linter en archivos staged
- Bloquear commit si hay errores

---

### CI/CD - GitHub Actions

#### [NEW] [.github/workflows/ci.yml](file:///C:/Users/Federico/.gemini/antigravity/scratch/agencia-web-b2b/.github/workflows/ci.yml)

Pipeline de CI:

1. **Lint & Type Check**
   - ESLint validation
   - TypeScript type checking
2. **Unit Tests**
   - Ejecutar Jest con coverage
   - Subir coverage report
3. **Build Verification**
   - `npm run build` para detectar errores de producción
4. **E2E Tests (opcional)**
   - Playwright tests en workflow separado
   - Solo en PRs a main

---

## Verification Plan

### Automated Tests

```bash
# Tests unitarios locales
npm run test

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E con UI interactiva
npm run test:e2e:ui
```

### Manual Verification

1. **Pre-commit Hook:** Hacer un commit con código mal formateado y verificar que Husky lo formatea automáticamente
2. **GitHub Actions:** Push a branch y verificar que el pipeline pasa exitosamente
3. **Coverage:** Revisar que el coverage sea >60% en componentes críticos

---

## Dependencies to Install

```bash
# Testing libraries
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom

# Next.js + Jest integration
npm install -D @types/jest ts-jest

# Playwright E2E
npm install -D @playwright/test

# Pre-commit tools
npm install -D husky lint-staged

# Optional: Coverage reporting
npm install -D @jest/globals
```

## Estimated Timeline

- **Testing Setup & Config:** 2-3 horas
- **Unit Tests (3 componentes):** 3-4 horas
- **E2E Tests (2 flujos):** 2-3 horas
- **Husky & Lint-staged:** 1 hora
- **GitHub Actions:** 1-2 horas

**Total:** 9-13 horas de desarrollo

---

## Post-Implementation Notes

Este sprint establece la **fundación** de testing. Tareas futuras recomendadas:

- Aumentar coverage a 80%+ gradualmente
- Agregar tests de regresión visual con Chromatic/Percy
- Configurar Dependabot para actualizaciones automáticas
- Implementar tests de performance con Lighthouse CI
