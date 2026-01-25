# Análisis de Fallo de Despliegue en Vercel - Linting Errors

**ID del Bug**: BUG-001  
**Fecha**: 25 de Enero, 2026  
**Severidad**: Alta (Bloquea Despliegue a Producción)  
**Reportado por**: CI/CD Pipeline (Vercel)

## 1. Descripción del Problema

El despliegue automático en Vercel falla durante la fase de "Build" debido a que el comando `npm run build` termina con código de salida 1. El log revela que el proceso de linting (`eslint`) encuentra errores bloqueantes que no permiten continuar con la generación de los estáticos.

## 2. Evidencia (Logs)

Los errores reportados en el log del build (`14:23:32`) son:

### A. Componente Header (Crítico)

```
./src/components/Header.tsx
52:9  Error: Error: This value cannot be modified
> 52 |         window.location.href = href;
```

El linter detecta una mutación directa de `window.location`, lo cual viola la regla `react-hooks/immutability` o las prácticas seguras de React para navegación.

### B. Componente CookieConsent

```
./src/components/CookieConsent.tsx
65:22  Error: `"` can be escaped with `&quot;`
```

Error de sintaxis JSX por uso de comillas dobles no escapadas dentro de texto.

### C. Tipado en Analytics y Tests

```
./src/lib/analytics.ts
17:31  Error: Unexpected any. Specify a different type.
```

Errores recurrentes de `no-explicit-any` en utilidades y archivos de test.

## 3. Diagnóstico de Causa Raíz

1.  **Diferencia de Entorno**: Es posible que el entorno local no estuviera corriendo el linting con la misma rigurosidad o configuración que el entorno de CI de Vercel (Next.js production build incluye un linting estricto por defecto).
2.  **Persistencia de Cache/Código**: A pesar de los intentos de corrección previos, los logs indican que el código analizado por Vercel SIGUE conteniendo `window.location.href = href`, lo que sugiere que:
    - Los cambios no se subieron correctamente al repositorio remoto (`origin/main`).
    - O Vercel está construyendo un commit anterior.

## 4. Impacto

- El sitio no puede actualizarse en producción.
- El pipeline de despliegue está en rojo (falla).

## 5. Referencias

- Vercel Logs (Provided by User).
