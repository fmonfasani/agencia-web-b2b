# Propuesta de Solución: Configuración de Entorno Vercel

**Bug ID**: BUG-002  
**Objetivo**: Permitir que el build de Vercel acceda a `DATABASE_URL`.

## 1. 🎯 Objetivo

Asegurar que las variables de entorno críticas (`DATABASE_URL`, `OPENAI_API_KEY`, etc.) estén disponibles durante la fase de Build y Runtime en Vercel.

## 2. 💡 Solución Técnica

### Opción A: Configuración Automática (Ideal)

Utilizar la integración de **Vercel Postgres**.

1.  Ir a pestaña **Storage** en Vercel.
2.  Crear una nueva base de datos (Neon/Postgres).
3.  Vincularla al proyecto.

- _Esto inyecta automáticamente `DATABASE_URL` y otras variables._

### Opción B: Configuración Manual

Si se usa una base de datos externa (Supabase, Railway, etc.):

1.  Ir a **Settings > Environment Variables**.
2.  Agregar `DATABASE_URL` con el string de conexión completo.

### Opción C: Fallback en Código (No recomendado para Prod)

Modificar `prisma.config.ts` para que no falle si falta la variable (usando `process.env.DATABASE_URL || "file:./dev.db"`), pero esto podría causar errores silenciosos más adelante.

**Recomendación**: Proceder con la **Opción A** o **B** ya que es la forma correcta de desplegar en producción.

## 3. 🛡️ Plan de Validación

1.  Re-desplegar desde Vercel (Redeploy).
2.  Verificar que el paso `prisma generate` se complete.
3.  Verificar que la aplicación inicie sin errores 500.
