# Análisis y Estrategia de Despliegue - Agencia Web B2B (Vercel)

## 1. 📊 Análisis de Situación

### Contexto Técnico

El proyecto `agencia-web-b2b` es una aplicación moderna construida sobre un stack tecnológico de "Bleeding Edge":

- **Framework**: Next.js 15 (App Router).
- **Estilos**: Tailwind CSS v4.
- **Base de Datos**: PostgreSQL (vía Prisma ORM v6).
- **Cache/Rate Limiting**: Upstash Redis (Serverless).
- **Dependencias Clave**: Framer Motion, Lucide React, OpenAI SDK.

### Diagnóstico de Infraestructura

Actualmente, el proyecto corre en entorno local (`npm run dev`). Para llevarlo a producción, necesitamos una infraestructura que soporte:

1.  **Serverless Computing**: Para las API routes de Next.js y Server Actions.
2.  **Edge Caching**: Para maximizar el puntaje de Lighthouse y la "Velocidad Extrema" definida en la visión.
3.  **Persistencia**: Una base de datos PostgreSQL accesible públicamente.
4.  **Gestión de Estado**: Redis para colas de tareas o limitación de tasa (Rate Limiting) en el bot de WhatsApp/Lead Gen.

### ¿Por qué Vercel?

Vercel es la plataforma nativa para Next.js y ofrece:

- **Zero Config**: Detección automática del framework.
- **Infraestructura como Código**: Integración directa con GitHub.
- **Vercel Postgres & Redis**: Marketplace de integraciones que simplifica la conexión con BD y Redis.
- **Preview Deployments**: Entornos de prueba automáticos por cada Pull Request.

---

## 2. 💡 Propuesta de Arquitectura

Proponemos una arquitectura **Serverless / Managed** para reducir el mantenimiento DevOps a cero y enfocarnos en el código.

### Componentes:

1.  **Frontend & API**: Vercel (Hosting, Edge Network, Serverless Functions).
2.  **Base de Datos**: **Vercel Postgres** (empowerado por Neon) o **Neon.tech** directo.
    - _Justificación_: Escalado automático y sleeping en tiers gratuitos/bajos costos.
3.  **Redis**: **Upstash** (Vía integración Vercel KV o directo).
    - _Uso_: Caching de respuestas de IA, Rate Limiting para formularios/chats.
4.  **Dominio**: Configuración de DNS en Vercel apuntando al dominio de la agencia.

### Flujo de CI/CD:

- **Push a `main`** -> Despliegue a Producción.
- **Push a `branch`** -> Despliegue a Preview (Entorno de Staging).
- **Database Migrations**: Ejecución automática de `prisma migrate deploy` durante el build.

---

## 3. 🛠️ Plan de Implementación

### Fase 1: Preparación (Local)

1.  Asegurar que `prisma.schema` esté optimizado para Edge (si es necesario) o Serverless.
2.  Configurar scripts de `package.json` para producción.
3.  Verificar variables de entorno necesarias.

### Fase 2: Configuración de Infraestructura (Vercel)

1.  Importar repositorio desde GitHub a Vercel.
2.  Provisionar Bases de Datos (Storage Tab -> Vercel Postgres / KV).
3.  Configurar Variables de Entorno en el Dashboard:
    - `DATABASE_URL`
    - `KV_URL` / `UPSTASH_REDIS_REST_URL`
    - `OPENAI_API_KEY`
    - `NEXT_PUBLIC_APP_URL`
    - `BLOB_READ_WRITE_TOKEN` (si usamos Vercel Blob para imágenes).

### Fase 3: Build & Deploy

1.  Configurar el "Build Command" en Vercel (Default: `next build`).
2.  Configurar "Install Command" (Default: `npm install`).
3.  **Crítico**: Configuración de migraciones.
    - Opción A: Comando personalizado `prisma migrate deploy && next build`.
    - Opción B: Correr migraciones manualmente o vía GitHub Action separada (Más seguro).
    - _Recomendación_: Opción A para empezar.

---

## 4. ✅ Tareas (Roadmap)

Lista de tareas accionables para el despliegue inmediato.

### Setup Inicial

- [ ] **Crear Proyecto en Vercel**: Vincular repo `fmonfasani/agencia-web-b2b`.
- [ ] **Provisionar Base de Datos**: Agregar Vercel Postgres store al proyecto.
- [ ] **Provisionar Redis**: Agregar Vercel KV (Upstash) store.
- [ ] **Variables de Entorno**: Copiar `.env` local a Vercel (excluyendo secretos de desarrollo).

### Código & Configuración

- [ ] **Script de Build**:
  - Modificar `package.json` si es necesario para correr migraciones automáticas.
  - Ejemplo: `"build": "prisma generate && next build"`.
  - _Nota_: `prisma generate` suele correr automáticamente en el post-install, pero es bueno asegurarlo.
- [ ] **Prisma Configuration**:
  - Verificar que el `output` en `schema.prisma` sea compatible.
  - Asegurar que `DATABASE_URL` use el pooler string de Vercel/Neon para serverless.

### Verificación

- [ ] **Test Deploy**: Realizar el primer despliegue.
- [ ] **Smoke Test**: Probar formulario de contacto (Lead creation).
- [ ] **Check Logs**: Revisar Runtime Logs en Vercel para errores de conexión a BD.
- [ ] **Performance Audit**: Correr Lighthouse en la URL de producción (Vercel Speed Insights).

### Próximos Pasos (Post-Deploy)

- [ ] Configurar dominio personalizado (www.agencia.com).
- [ ] Activar Vercel Analytics y Speed Insights.
- [ ] Configurar cron jobs para limpieza de datos (via Vercel Cron).
