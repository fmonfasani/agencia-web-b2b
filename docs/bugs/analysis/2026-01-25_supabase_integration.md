# Análisis de Fallo de Despliegue - Integración Supabase

**ID del Bug**: BUG-003  
**Fecha**: 25 de Enero, 2026  
**Severidad**: Bloqueante  
**Contexto**: El build falla por falta de `DATABASE_URL`, a pesar de tener la integración de Supabase activa.

## 1. 📊 Diagnóstico

Vercel y Supabase, al integrarse nativamente, inyectan un conjunto específico de variables de entorno para manejar el connection pooling correctamente:

- `POSTGRES_PRISMA_URL`: URL para el Transaction Pooler (ideal para Serverless).
- `POSTGRES_URL_NON_POOLING`: URL directa a la base de datos (para migraciones).

Sin embargo, nuestro código (`prisma/schema.prisma` y `prisma.config.ts`) está configurado para buscar `DATABASE_URL`. Como esta variable no es creada automáticamente por la integración, el build falla.

## 2. 📸 Evidencia

- Capturas del usuario muestran la integración de Supabase activa.
- Lista de variables disponibles incluye `POSTGRES_PRISMA_URL` y `POSTGRES_URL_NON_POOLING`.
- Error de build: `Missing required environment variable: DATABASE_URL`.

## 3. 🧠 Solución Recomendada

En lugar de luchar contra la corriente creando alias manuales, **adaptaremos nuestra aplicación para usar el estándar de Vercel/Supabase**. Esto es más robusto y aprovecha el connection pooling automáticamente.

---

# Propuesta de Solución: Adaptación a Estándar Supabase

## 1. Cambios en Código

Refactorizar la configuración de Prisma para utilizar las variables nativas de la integración.

**`prisma/schema.prisma`**:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL") // Connection Pooling
  directUrl = env("POSTGRES_URL_NON_POOLING") // Direct Migration
}
```

**`prisma.config.ts`**:

```typescript
datasource: {
  url: env("POSTGRES_PRISMA_URL"),
},
```

## 2. Compatibilidad Local

Para no romper el entorno de desarrollo local (`npm run dev`), actualizaremos el archivo `.env` local mapeando la actual `DATABASE_URL` a estas nuevas claves.

---

# Plan de Tareas

## ✅ Checklist

- [ ] **Backup**: Leer valor actual de `DATABASE_URL` en local.
- [ ] **Local Environment**:
  - Agregar `POSTGRES_PRISMA_URL` a `.env`.
  - Agregar `POSTGRES_URL_NON_POOLING` a `.env`.
- [ ] **Refactor Code**:
  - Modificar `prisma/schema.prisma`.
  - Modificar `prisma.config.ts`.
- [ ] **Deploy**:
  - Push cambios a `main`.
  - Verificar que Vercel detecte las variables y compile correctamente.
