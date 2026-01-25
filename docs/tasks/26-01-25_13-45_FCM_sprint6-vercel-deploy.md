# Sprint 6: Despliegue en Producción (Vercel)

**Estado:** 🟡 Planificado  
**Fecha de Inicio:** 25 de Enero, 2026  
**Objetivo Principal:** Desplegar la aplicación `agencia-web-b2b` en un entorno de producción serverless utilizando Vercel, asegurando la conectividad de base de datos (Postgres) y caché (Redis).

---

## 📋 Backlog del Sprint

### 1. Preparación de Infraestructura

- [ ] **Configurar Proyecto en Vercel**
  - Conectar repositorio GitHub `fmonfasani/agencia-web-b2b`.
  - Configurar Root Directory (si aplica, por defecto `./`).
- [ ] **Provisionar Base de Datos (Postgres)**
  - Crear instancia de Vercel Postgres (o Neon).
  - Vincular al proyecto.
- [ ] **Provisionar Redis (KV)**
  - Crear base de datos Upstash Redis adecuada para el proyecto.
  - Vincular al proyecto.

### 2. Configuración de Entorno

- [ ] **Variables de Entorno Prodr**
  - Configurar `OPENAI_API_KEY`.
  - Revisar `DATABASE_URL` y `KV_URL` (o `UPSTASH_REDIS_REST_URL`) auto-generadas.
  - Configurar `NEXT_PUBLIC_APP_URL` con la URL de producción (o dominio temporal `.vercel.app`).

### 3. Build & CI/CD

- [x] **Optimización de Build Script** (Realizado en pre-sprint: `prisma generate && next build`).
- [ ] **Ejecución de Primer Despliegue**
  - Verificar logs de Build.
  - Verificar logs de Runtime (Serverless Functions).
- [ ] **Migración de Base de Datos**
  - Ejecutar migraciones en la BD de producción.
  - Verificar esquema de tablas.

### 4. Verificación y Calidad (QA)

- [ ] **Smoke Test - Lead Gen**
  - Enviar formulario de contacto de prueba.
  - Verificar entrada en BD.
- [ ] **Smoke Test - WhatsApp Bot** (si aplica endpoint público)
  - Verificar conectividad webhook.
- [ ] **Auditoría de Performance**
  - Correr Lighthouse / PageSpeed Insights en URL de producción.
  - Validar funcionamiento de imágenes (Vercel Blob / External).

---

## ✅ Definition of Done (DoD)

1.  La aplicación está accesible públicamente vía HTTPS (`*.vercel.app` o dominio propio).
2.  El build pipeline en Vercel pasa exitosamente (verde).
3.  La base de datos de producción tiene el esquema actualizado.
4.  El formulario de contacto guarda datos correctamente en la BD de producción.
5.  No existen errores críticos (500) en el log de Vercel durante la navegación básica.
