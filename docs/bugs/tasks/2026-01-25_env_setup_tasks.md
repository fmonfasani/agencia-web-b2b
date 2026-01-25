# Plan de Implementación: Configuración de Variables

**Sprint**: Sprint 6 (Deploy)  
**Estado**: Bloqueante

## ✅ Checklist de Tareas

### Configuración en Vercel (Dashboard)

- [ ] **Verificar Base de Datos**
  - Entrar al Proyecto > Storage.
  - Asegurar que existe una BD "Postgres" creada.
  - Si no existe: Crear -> Connect.
- [ ] **Verificar Variables de Entorno**
  - Entrar a Settings > Environment Variables.
  - Buscar `DATABASE_URL`.
  - Si no está: Agregarla manualmente o darle al botón "Pull" si se desincronizó.
  - Verificar `OPENAI_API_KEY` (necesaria para runtime).

### Acciones de Despliegue

- [ ] **Redeploy**
  - Ir a Deployments.
  - Seleccionar el último commit.
  - Clic en "Redeploy" (sin cache si es posible).

## 🏁 Definition of Done (DoD)

1.  El error `PrismaConfigEnvError: Missing required environment variable` desaparece del log.
2.  El build finaliza con éxito ("Compiled successfully").
