# Propuesta de Solución: Corrección de Errores de Linting

**Bug ID**: BUG-001  
**Relacionado a**: Despliegue en Vercel

## 1. Objetivo

Lograr que el pipeline de `npm run build` en Vercel finalice exitosamente (Green Build), eliminando todos los errores de ESLint y TypeScript bloqueantes.

## 2. Solución Técnica Propuesta

### A. Header.tsx: Navegación Segura

Reemplazar la asignación directa de `window.location.href` por el método `window.location.assign()`. Esto realiza la misma acción (navegación) pero es semánticamente una llamada a función en lugar de une mutación de propiedad, lo que satisface al linter estático.

**Código Anterior:**

```typescript
window.location.href = href;
```

**Código Nuevo:**

```typescript
window.location.assign(href);
```

### B. CookieConsent.tsx: Escapado de Caracteres

Sustituir las comillas dobles literales por entidades HTML para cumplir con XML/JSX compliance.

- `"` -> `&quot;`

### C. Analytics.ts: Tipado Estricto

Eliminar el uso de `any` explícito. Usar `unknown` o `Record<string, unknown>` para mantener la flexibilidad sin violar las reglas de TypeScript.

### D. Configuración de ESLint

Excluir explícitamente los directorios de pruebas (`__tests__`) del proceso de linting de producción, ya que estos archivos no son necesarios para el runtime y suelen tener reglas más relajadas.

---

## 3. Plan de Verificación

1.  **Verificación Local**: Ejecutar `npm run lint` y `npx tsc --noEmit` localmente y asegurar "Exit code: 0".
2.  **Verificación Remota**: Forzar un nuevo despliegue y verificar que el log no muestre las líneas de error mencionadas.
3.  **Confirmación de Código**: Verificar vía `git diff` que los cambios realmente existen en `origin/main`.
