# Diseño Enterprise de Perfiles, Roles y Permisos (RBAC) para SaaS Multi-Tenant

> Última actualización: 2026-04-14

---

## 1. Objetivo

Definir un modelo de autorización **seguro, escalable y mantenible** para la plataforma multi-tenant, evitando hardcoding, fugas entre tenants y duplicación de lógica.

---

## 2. Roles del sistema

### Nivel de Plataforma (Webshooks / Agencia Madre)

| Rol | Descripción | Acceso |
|---|---|---|
| **SUPER_ADMIN** | Dueño de la plataforma | Acceso total: crear tenants, gestionar suscripciones, soporte global |
| **ANALISTA** | Equipo de Webshooks | Observabilidad de todos los tenants, gestionar agentes, ingesta RAG, soporte técnico |

### Nivel de Negocio (Tenants / Clientes)

| Rol | Descripción | Acceso |
|---|---|---|
| **ADMIN** | Dueño de la empresa cliente | Gestionar pagos, invitar miembros, ver métricas propias, borrar datos |
| **MEMBER** | Empleado con acceso operativo | Gestionar agentes, ver historial, subir documentos |
| **CLIENTE** | Usuario final / integración API | Solo ejecutar agentes de su tenant vía API |
| **VIEWER** | Analista / socio (solo lectura) | Ver dashboards y reportes sin editar |

> **Regla clave**: SUPER_ADMIN y ANALISTA son roles de **plataforma** — tienen visibilidad cross-tenant. ADMIN y los demás son roles de **tenant** — aislados a su propia organización.

---

## 3. Modelo conceptual

```
User (1) ────< Membership >──── (1) Tenant
               │
               ├── role (ADMIN|MEMBER|CLIENTE|VIEWER)
               │
               └── Profile (1:1 con User)
                     └── nombre, locale, timezone, avatar
```

**Regla operativa:** toda decisión de acceso se evalúa con:
`(user_id, tenant_id, action, resource)`

---

## 4. Tabla User (PostgreSQL — Prisma)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | VARCHAR(100) PK | ID único (prefijo `u_` o `c_`) |
| `email` | VARCHAR(255) UNIQUE | Email de login |
| `passwordHash` | TEXT | bcrypt con pre-hash SHA256 |
| `name` | VARCHAR(200) | Nombre completo |
| `role` | VARCHAR(50) | Rol del sistema (SUPER_ADMIN, ANALISTA, ADMIN, MEMBER, CLIENTE, VIEWER) |
| `defaultTenantId` | VARCHAR(100) FK | Tenant activo por defecto |
| `apiKey` | VARCHAR(255) UNIQUE | Formato `wh_xxxxx` — autenticación API |
| `status` | VARCHAR(20) | `ACTIVE` / `INACTIVE` |
| `createdAt` | TIMESTAMP | Fecha de registro |
| `updatedAt` | TIMESTAMP | Última modificación |

> **Nota**: el campo `role` almacena el valor como string en mayúsculas. La autorización SIEMPRE usa el valor de `role` — nunca asumir permisos por `defaultTenantId`.

---

## 5. Perfiles vs Roles

| Concepto | Qué es | Qué NO hace |
|---|---|---|
| **Rol** | Define capacidades sobre recursos | No es un dato de perfil personal |
| **Perfil** | Nombre, foto, locale, timezone, preferencias | No autoriza nada |

**Principio:** nunca derivar permisos del perfil. El rol es la única fuente de verdad para autorización.

---

## 6. Matriz de acceso por módulo

| Módulo | SUPER_ADMIN | ANALISTA | ADMIN | MEMBER | CLIENTE | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Ver todos los tenants | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Observabilidad cross-tenant | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| CRUD agentes IA | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ejecutar agente (`/agent/execute`) | ✅ | ✅ | ✅ | ✅ | ✅ (solo su tenant) | ❌ |
| Ver trazas (traces) | ✅ todos | ✅ todos | ✅ solo propias | ❌ | ❌ | ❌ |
| Ver métricas | ✅ todos | ✅ todos | ✅ solo propias | ❌ | ❌ | ✅ propias |
| Gestión de usuarios | ✅ | ❌ | ✅ (solo su tenant) | ❌ | ❌ | ❌ |
| Configuración de tenant | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Subir documentos (Training) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ingestar documentos (RAG) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rotar API Key | ✅ | ✅ (propia) | ✅ (propia) | ✅ (propia) | ✅ (propia) | ✅ (propia) |
| Facturación / Billing | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Agent Lab (comparación A/B) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear usuarios analistas | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## 7. Implementación backend (FastAPI)

```python
# backend-saas/app/auth_router.py

def require_admin(user: dict):
    """Rol ADMIN o SUPER_ADMIN"""
    if user["rol"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(403, "Solo admins")

def require_analista_or_admin(user: dict):
    """Cualquier rol de plataforma o admin de tenant"""
    if user["rol"] not in ("ADMIN", "SUPER_ADMIN", "ANALISTA"):
        raise HTTPException(403, "Se requiere rol analista o admin")
```

```python
# backend-agents/app/auth/agent_auth.py

def validate_tenant_access(user: dict, tenant_id: str) -> bool:
    """SUPER_ADMIN y ANALISTA acceden a cualquier tenant"""
    rol = user.get("rol", "").lower()
    if rol in ("admin", "superadmin", "super_admin", "analista"):
        return True
    return user.get("tenant_id") == tenant_id
```

---

## 8. API Keys y lifecycle

- Cada usuario tiene UNA `apiKey` (`wh_xxxxx`).
- Las operaciones de RAG/ingesta para clientes deben usar la API key del **ANALISTA** responsable — nunca la del cliente.
- Rotación: `POST /auth/rotate-key` invalida la key anterior instantáneamente.
- Expiración: no implementada aún → **TODO**: agregar `apiKeyExpiresAt` a la tabla `User`.

---

## 9. Aislamiento multi-tenant

El filtro `tenant_id` es **obligatorio** en toda query de datos de negocio. Los endpoints de backend-agents aplican esto en la capa de datos:

```sql
-- Correcto: siempre filtrar por tenant
SELECT * FROM agent_request_traces WHERE tenant_id = %s

-- Admin / Analista: pueden omitir el filtro para ver todo
SELECT * FROM agent_request_traces ORDER BY created_at DESC
```

---

## 10. ANALISTA y operaciones de ingesta

Cuando un **ANALISTA** realiza operaciones sobre el tenant de un cliente:
1. Usa SU PROPIA API key (para autenticarse)
2. Especifica el `tenant_id` del cliente en el request body
3. El backend valida que el ANALISTA tiene acceso cross-tenant antes de operar

Esto garantiza trazabilidad: los logs muestran qué analista actuó sobre qué tenant.

---

## 11. Errores comunes a evitar

1. Roles hardcodeados en el código de UI (solo para UX, nunca para seguridad)
2. Confiar el `tenant_id` enviado por el cliente sin validar en backend
3. Permitir que CLIENTE acceda a trazas o métricas de otros tenants
4. API Keys sin expiración en producción
5. El campo `role` en `User` no es un SQL Enum — validar siempre en la capa de aplicación

---

## 12. Roadmap de madurez RBAC

### Quick wins (próximas 2 semanas)
- [ ] Agregar `apiKeyExpiresAt` con expiración de 90 días
- [ ] Endpoint `GET /auth/me` devuelve perfil completo con rol y tenant name
- [ ] UI de gestión de equipo (ADMIN puede ver/activar/desactivar usuarios de su tenant)
- [ ] Página de perfil de usuario con datos reales

### Mejoras estructurales (1-2 meses)
- [ ] Tabla `Membership` para usuarios multi-tenant
- [ ] Scopes por API key (ej: `read-only`, `execute-only`, `full`)
- [ ] Cache de permisos en Redis (clave: `authz:{tenant_id}:{user_id}`)
- [ ] Audit log de acciones sensibles (quién hizo qué sobre qué tenant)
- [ ] Feature flags por tenant (`tenant_features` table)

---

**Documento:** `docs/dbs/roles-definition.md`
**Fecha de actualización:** 2026-04-14
