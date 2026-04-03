# Tasks: Webshooks 2.0 Implementation

## [x] Fase Inicial: Diagnóstico y Propuesta
- [x] Análisis de infraestructura y arquitectura actual.
- [x] Conversión del plan de negocio a Markdown.
- [x] Documentación técnica de Infraestructura, DB y Roles.
- [x] Diseño del Plan Maestro Integral.

## [x] Fase 0: Estabilización Crítica (Seguridad y Arquitectura)
- [x] Refactorización de `schema.prisma` (Relaciones y Enums).
- [x] Implementación de Prisma Client Extensions (Aislamiento Automático).
- [ ] Auditoría de Route Handlers para IDOR.
- [ ] Integración de Sentry para Observabilidad Crítica.

## [x] Fase 1: Base Sólida Multi-Tenant Segura
- [x] Implementación de Middleware de Tenant Context.
- [x] Flujo de Auth con inyección de `tenantId`.
- [x] Sistema de validación de membresías y roles.

## [/] Fase 2: Módulo de Revenues Completo
- [x] Dashboard Ejecutivo (Métricas real-time).
- [x] CRM Kanban de Leads y Deals.
- [ ] Integración con Stripe/Subscription Billing.

## [/] Fase 3: Factory de Agentes IA
- [/] Interfaz de configuración de OpenAI Assistants.
- [ ] Sistema de Knowledge Base por Tenant (Vector Stores).
- [ ] Lógica de Handoff (IA -> Humano).

## [ ] Fase 4: Escala Operativa
- [ ] Automatización de Onboarding (Click-to-Deploy).
- [ ] Scraper de leads distribuido por Tenant.
- [ ] CI/CD avanzado y Logs estructurados.

## [ ] Fase 5: Optimización Financiera
- [ ] Análisis de Unit Economics por Tenant.
- [ ] Ajuste de Pricing dinámico.
- [ ] Auditoría final de seguridad y cumplimiento.
