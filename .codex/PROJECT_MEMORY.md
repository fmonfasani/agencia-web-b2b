# PROJECT_MEMORY.md — Webshooks Internal Semantic Map

# Updated: 2026-03-03

# Purpose: Internal memory/context for AI agents.

## Infrastructure & Environment

- **Cloud Provider**: DigitalOcean (NYC3)
- **Host**: Droplet Ubuntu 24.04 (agencia-dropletv1)
- **Containerization**: Docker (multidb-postgres container)
- **Database**: PostgreSQL 16 (agencia_web_b2b)
- **Security**: DigitalOcean Cloud Firewall (Port 5432 restricted to Owner IP)
- **ORM Config**: Prisma using `%23` for `#` in connection string inside `.env`.

## Vision: Módulo de Revenues

- **Objective**: Evolution into a SaaS platform for multiple agencies.
- **Model**: Multi-tenant, Multi-user, Multi-agent.
- **Hybrid Model**: Support for both Human (SALES_REP) and AI (Agent) representatives operating in tandem across all channels.
- **Components**: CRM Kanban, Acquisition Scraper, IA Agents Factory.

## Core Data Models

- **User**: Global identity.
- **Tenant**: Root organization unit (Multi-tenancy isolation).
- **Membership**: Links User to Tenant with RBAC (SUPER_ADMIN, ADMIN, OPERATOR, SALES_REP, VIEWER).
- **Agent**: AI Assistant linked to OpenAI API.
- **Lead**: Potential customer (Scraper, Manual, API).
- **Deal**: Sales opportunity (assigned to User or Agent).

## Completed Milestones

- [x] Production infrastructure setup (DigitalOcean + Docker).
- [x] Database migration from Supabase to self-hosted PostgreSQL.
- [x] Full security audit and Cloud Firewall implementation.
- [x] Business Strategy conversion to Markdown.

## Pending Tasks (Next Phase: Cimientos)

- [ ] Implement Prisma Client Extensions for automatic `tenantId` filtering.
- [ ] Refactor `Activity`, `Task`, `Project` relations in `schema.prisma`.
- [ ] Standardize RBAC enums in `Membership`.

---

_Updated by the Engineering Agent for Webshooks._
