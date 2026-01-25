# Plan de Implementación: V2 Product Foundation

**Proyecto:** Agencia Web B2B  
**Etapa:** Post-Sprint 4  
**Fecha:** 25 de Enero, 2026

---

## Objetivo

Sentar las bases técnicas para la evolución de la landing page a una plataforma de servicios B2B, implementando la infraestructura de base de datos y el motor de contenidos.

---

## Fases de Implementación

### Fase 1: Infraestructura y Datos (Backend Priority)

- **Setup Prisma:** Configuración del ORM y modelos iniciales (`Lead`, `Project`, `BlogPost`).
- **Database Connection:** Configuración de variables de entorno y conexión con PostgreSQL.
- **API Restructuring:** Migración de los handlers de contacto a un sistema basado en base de datos en lugar de solo envío de email.

### Fase 2: Content Hub (Authority Priority)

- **Markdown Engine:** Implementar `next-mdx-remote` o similar para gestionar artículos desde archivos `.md`.
- **Blog Layout:** Diseño de página de listado y página de lectura individual con foco en legibilidad premium.

### Fase 3: Conversion Tools (Lead Priority)

- **ROI Calculator Component:** Widget interactivo en la Home/Pricing.
- **Lead Enrichment:** Integrar una API de terceros (opcional) para enriquecer datos de empresas basados en el dominio del email.

---

## Detalle Técnico de Tareas

### Tarea [BE-001]: Setup Database

```bash
npm install prisma @prisma/client
npx prisma init
```

_Modelo sugerido:_

```prisma
model Lead {
  id        String   @id @default(cuid())
  email     String
  name      String?
  company   String?
  budget    String?
  message   String
  status    String   @default("NEW") // NEW, CONTACTED, QUALIFIED, LOST
  createdAt DateTime @default(now())
}
```

### Tarea [FE-010]: Blog Framework

- Crear `src/app/blog/[slug]/page.tsx`.
- Implementar `getStaticPaths` para generación estática (SSG) de posts.

---

## Plan de Verificación

1. **Migrations:** Verificar que Prisma genera las tablas correctamente en DB.
2. **API Testing:** Usar Postman/Thunder Client para testear el endpoint `/api/leads`.
3. **Responsive Blog:** Verificar que los artículos se ven perfectos en móvil.

---
