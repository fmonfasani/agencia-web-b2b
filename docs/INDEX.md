# Documentación — Webshooks

Índice centralizado de toda la documentación del proyecto.

**Última actualización:** 2026-04-18 | **Versión:** 3.0

---

## 📌 Comienza Aquí

### 🚀 Para Nuevos Desarrolladores

1. **[QUICK_START.md](QUICK_START.md)** — Setup local en 30 minutos
   - Requisitos, instalación, configuración, comandos útiles
   - Troubleshooting común

2. **[PROJECT_STATUS.md](PROJECT_STATUS.md)** — Estado actual del proyecto
   - Arquitectura, stack, estructura de directorios
   - Todas las fases completadas

3. **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** — Sistema visual
   - Paleta de colores, tipografía, componentes
   - Guía de accesibilidad

---

## 📚 Documentación Técnica

### Arquitectura & Decisiones

| Documento | Contenido |
|-----------|-----------|
| [walkthrough.md](walkthrough.md) | Walkthrough técnico por fases (0-4) |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Estado completo, stack, estructura |

### Infraestructura & Deployment

| Documento | Contenido |
|-----------|-----------|
| [Infraestructura.md](Infraestructura.md) | Docker, servicios, variables env, Cloud |
| [ENVIRONMENTS.md](../ENVIRONMENTS.md) | Guía de variables de entorno |
| [E2E_TEST.md](../E2E_TEST.md) | Testing end-to-end |

### Seguridad

| Documento | Contenido |
|-----------|-----------|
| [Security/secret-rotation.md](Security/secret-rotation.md) | Rotación de API keys y credenciales |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🔒) | 13 vulnerabilidades resueltas |

### Frontend

| Documento | Contenido |
|-----------|-----------|
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Sistema visual, componentes, tokens |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 📊) | Módulos dashboard, client, admin |

### Backend

| Documento | Contenido |
|-----------|-----------|
| [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🤖) | Motor LangGraph, endpoints |
| [walkthrough.md](walkthrough.md) | Arquitectura por fases |

---

## 🎯 Tareas & Roadmap

| Documento | Contenido |
|-----------|-----------|
| [task.md](task.md) | Tareas en progreso, completadas, pendientes |

---

## 💡 Guías por Caso de Uso

### "Quiero levantar el proyecto en local"
→ [QUICK_START.md](QUICK_START.md)

### "Necesito entender la arquitectura"
→ [PROJECT_STATUS.md](PROJECT_STATUS.md) + [walkthrough.md](walkthrough.md)

### "Voy a hacer un cambio visual"
→ [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

### "Necesito deployar a producción"
→ [Infraestructura.md](Infraestructura.md) + [ENVIRONMENTS.md](../ENVIRONMENTS.md)

### "Quiero escribir un nuevo endpoint"
→ [PROJECT_STATUS.md](PROJECT_STATUS.md) (API Gateway) + Swagger en `/docs`

### "Necesito rotar credenciales"
→ [Security/secret-rotation.md](Security/secret-rotation.md)

### "Quiero entender el motor de agentes"
→ [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🤖) + [walkthrough.md](walkthrough.md) (Fase 3)

### "Necesito ver tareas pendientes"
→ [task.md](task.md)

---

## 📋 Documentos por Tipo

### Overview & Estado

```
├── PROJECT_STATUS.md          ⭐ Estado actual completo
├── walkthrough.md             Fases técnicas 0-4
├── README.md (raíz)           Intro + quick links
└── task.md                    Tareas
```

### Setup & Desarrollo

```
├── QUICK_START.md             Setup local (nuevos devs)
├── ENVIRONMENTS.md            Variables env
├── Infraestructura.md         Docker + Cloud
└── E2E_TEST.md               Testing
```

### Diseño & UI

```
└── DESIGN_SYSTEM.md           Paleta, componentes, tipografía
```

### Seguridad

```
└── Security/
    └── secret-rotation.md     Rotación credenciales
```

### Referencias Personales

```
└── .md/
    ├── fmonfasani/            Metodología Federico
    └── webhooks/              Documentación webhooks
```

---

## 🔍 Búsqueda Rápida

### Por Tecnología

**Next.js/Frontend:**
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — Componentes, tokens
- [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 📊) — Módulos
- [QUICK_START.md](QUICK_START.md) — Setup frontend

**FastAPI/Backend:**
- [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🤖) — Motor agentes
- [walkthrough.md](walkthrough.md) — Arquitectura
- [Swagger en `/docs`](http://localhost:8000/docs) — Endpoints

**Docker/Infraestructura:**
- [Infraestructura.md](Infraestructura.md) — Completo
- [QUICK_START.md](QUICK_START.md) — Setup local

**PostgreSQL/Bases de Datos:**
- [Infraestructura.md](Infraestructura.md) (Sección 6) — Schema
- [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🤖) — Session persistence

**LangGraph/Agentes:**
- [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🤖) — Completo
- [walkthrough.md](walkthrough.md) (Fase 3) — Arquitectura

**Seguridad:**
- [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🔒) — Vulnerabilidades
- [Security/secret-rotation.md](Security/secret-rotation.md) — Rotación keys

### Por Fase

**Fase 0 — Diseño Visual:**
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🎨)
- [walkthrough.md](walkthrough.md) (Fase 0)

**Fase 1 — Auth Multi-Tenant:**
- [walkthrough.md](walkthrough.md) (Fase 1)
- [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🔐)

**Fase 2 — Dashboard:**
- [walkthrough.md](walkthrough.md) (Fase 2)
- [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 📊)

**Fase 3 — Motor Agentes:**
- [walkthrough.md](walkthrough.md) (Fase 3)
- [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🤖)

**Fase 4 — Seguridad:**
- [walkthrough.md](walkthrough.md) (Fase 4)
- [PROJECT_STATUS.md](PROJECT_STATUS.md) (Sección 🔒)

---

## 🗂️ Mapa de Docs

```
docs/
├── INDEX.md                          ← Estás aquí
├── PROJECT_STATUS.md                 ⭐ Lee esto primero
├── QUICK_START.md                    Setup local
├── DESIGN_SYSTEM.md                  Sistema visual
├── walkthrough.md                    Fases técnicas
├── Infraestructura.md                Docker + Cloud
├── task.md                           Tareas
│
├── Security/
│   └── secret-rotation.md            Credenciales
│
├── dbs/
│   ├── schema-report.md              Schema SQL
│   └── roles-definition.md           Roles DB
│
└── .md/
    ├── fmonfasani/                   Metodología personal
    └── webhooks/                     Docs varias
```

---

## 🔄 Flujo de Actualización

Cuando hay cambios importantes:

1. **Actualizar:** [PROJECT_STATUS.md](PROJECT_STATUS.md) — estado actual
2. **Detallar:** [walkthrough.md](walkthrough.md) — si es arquitectura
3. **Visual:** [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — si es UI
4. **Infra:** [Infraestructura.md](Infraestructura.md) — si es deployment
5. **Índice:** Este [INDEX.md](INDEX.md) — si hay nuevos docs
6. **Tasks:** [task.md](task.md) — registrar trabajo

---

## 📞 Navegación Rápida

| Necesito... | Ir a... |
|------------|---------|
| Setup local | [QUICK_START.md](QUICK_START.md) |
| Estado actual | [PROJECT_STATUS.md](PROJECT_STATUS.md) |
| Componentes UI | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) |
| Arquitectura técnica | [walkthrough.md](walkthrough.md) |
| Docker/Cloud | [Infraestructura.md](Infraestructura.md) |
| Rotar credenciales | [Security/secret-rotation.md](Security/secret-rotation.md) |
| Ver tareas | [task.md](task.md) |
| Entender rol/permiso | [dbs/roles-definition.md](dbs/roles-definition.md) |
| API endpoints | http://localhost:8000/docs (Swagger) |

---

## ✅ Checklist de Verificación

¿Nuevo en el proyecto?

- [ ] Leí [QUICK_START.md](QUICK_START.md)
- [ ] Levanté local exitosamente
- [ ] Leí [PROJECT_STATUS.md](PROJECT_STATUS.md) resumen
- [ ] Entendí las 5 fases
- [ ] Reviewé [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) colores
- [ ] Vi los módulos en `/app` y `/admin`
- [ ] Testé un endpoint en Swagger

---

**Última actualización:** 2026-04-18  
**Rama activa:** main  
**Versión:** 3.0 (Warm Neutral Design)

¿Preguntas? Ver [README.md](../README.md) sección Contacto.
