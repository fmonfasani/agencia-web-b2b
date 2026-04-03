# Definición de Roles y Permisos (RBAC) - Módulo de Revenues

Para una plataforma multi-tenant, la jerarquía de roles debe separar las responsabilidades de la "Agencia Madre" (tú) de las "Agencias Cliente" (tenants).

## 1. Nivel de Plataforma (Agencia Madre)
Estos roles tienen visibilidad sobre el funcionamiento global del sistema.

| Rol | Descripción | Permisos Clave |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | Tú (Dueño de la Plataforma) | Acceso total, crear tenants, gestionar suscripciones, soporte técnico global. |
| **SUPPORT_TECH** | Tu equipo de soporte | Ver logs de errores, asistir a clientes en la configuración de agentes. |

## 2. Nivel de Negocio (Tenants / Clientes)
Estos roles están aislados dentro de cada tenant. Un usuario es "Admin" en su propia agencia, pero no existe para las demás.

| Rol | Nombre | Perfil | Permisos Clave |
| :--- | :--- | :--- | :--- |
| **ADMIN** | Dueño de Agencia | Dueño del negocio | Gestionar pagos, invitar empleados, ver métricas de revenue, borrar datos. |
| **OPERATOR** | Gestor de IA | Configura agentes | Crear/Editar agentes, subir bases de conocimiento (PDFs), ver historial de chats. |
| **SALES_REP** | Vendedor | Cierra ventas | Gestionar el Pipeline (Kanban), contactar leads, mover Deals de etapa. |
| **VIEWER** | Analista / Socio | Solo lectura | Ver dashboards de métricas y reportes de leads sin poder editar nada. |

## 3. Matriz de Acceso por Módulo

| Módulo | Admin | Operator | Sales | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **Configuración de Tenant** | ✅ | ❌ | ❌ | ❌ |
| **CRUD de Agentes IA** | ✅ | ✅ | ❌ | ❌ |
| **Gestión de Leads** | ✅ | ✅ | ✅ | 👁️ |
| **Pipeline de Ventas (Deals)** | ✅ | ❌ | ✅ | 👁️ |
| **Métricas de Revenues** | ✅ | ❌ | ❌ | ✅ |
| **Gestión de Usuarios** | ✅ | ❌ | ❌ | ❌ |

## 4. Modelo de Colaboración Mixta (Hybrid Model)

Para que el negocio sea mixto, el sistema debe permitir tres estados de operación en cada canal:

1.  **Full IA**: El agente IA gestiona el 100% de la conversación. Ideal para prospección masiva.
2.  **Copilot**: La IA sugiere respuestas, pero el `SALES_REP` (Humano) las aprueba o edita.
3.  **Human Takeover**: Cuando la IA detecta un "Intento de Cierre" o una queja, notifica al `SALES_REP` para que tome el control total del chat.

## 5. Implementación Técnica
- **Aislamiento**: El sistema verifica primero el `tenantId` y luego el `role` dentro de ese tenant.
- **Middleware**: Un `authMiddleware` bloqueará rutas de API según el rol del usuario en la sesión actual.
- **Prisma**: Las consultas se filtran por defecto para que un `SALES_REP` solo vea sus leads asignados o todos los del tenant según la configuración.

---
**Documento:** `docs/dbs/roles-definition.md`
**Fecha:** 2026-03-03
