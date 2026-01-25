# Tareas de Implementación: Fix Redis Build Error

**Sprint**: Sprint 6 (Deploy Support)  
**Estado**: En Proceso

---

## ✅ Lista de Tareas

### Refactorización de Código

- [ ] **Modificar `src/lib/bot/redis-context.ts`**
  - Implementar función `getRedisClient()` para inicialización bajo demanda.
  - Soportar variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` (estándar de Vercel).
  - Asegurar que las funciones existentes (`getConversationHistory`, etc.) usen este nuevo método.

### Sincronización

- [ ] **Commit y Push**
  - Subir cambios a `main`.

### Verificación

- [ ] **Confirmar Build en Vercel**
  - El semáforo debe pasar a verde o avanzar al menos de etapa.
