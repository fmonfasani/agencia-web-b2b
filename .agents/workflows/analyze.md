---
description: Analiza el repositorio de Webshooks y propone mejoras usando Codex y sus herramientas de agente.
---

// turbo-all

1. Ejecutar `grep_search` para encontrar patrones de error en `src/app/api` y `src/actions` (o equivalentes de mutación).
2. Analizar las operaciones de Prisma en `src/lib/prisma.ts` para asegurar el aislamiento de `tenantId`.
3. Revisar el archivo `prisma/schema.prisma` para verificar consistencia de relaciones.
4. El agente deberá actuar como Arquitecto de Software y proponer un plan de acción técnica centrado en Webshooks.
5. Verificar el estado de la base de datos con `prisma db pull --print` (solo para visualizar estado actual).
