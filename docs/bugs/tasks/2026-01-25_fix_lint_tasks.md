# Tareas de Implementación: Fix Lint Errors

**Sprint**: Bugfix (Sprint 6 Support)  
**Estado**: En Progreso

---

## ✅ Lista de Tareas

### Corrección de Código

- [x] **Refactorizar Header.tsx**
  - Cambiar `window.location.href` por `window.location.assign()`.
- [x] **Corregir CookieConsent.tsx**
  - Escapar comillas en texto JSX.
- [x] **Tipar Analytics.ts**
  - Reemplazar `any` por tipos seguros (`unknown`).

### Configuración

- [x] **Actualizar ESLint Config**
  - Ignorar `src/components/__tests__`.
  - Ignorar `e2e`.

### Gestión de Versiones (Git)

- [ ] **Validar Sincronización**
  - Verificar que `origin/main` tenga los últimos cambios de refactorización.
  - _Acción_: Ejecutar `git diff origin/main src/components/Header.tsx` para confirmar discrepancias.
- [ ] **Forzar Actualización (Si es necesario)**
  - Si hay discrepancia, realizar un nuevo commit y push.

### Validación

- [ ] **Build Check en Vercel**
  - Monitorear el siguiente despliegue.
- [ ] **Smoke Testing**
  - Verificar navegación en deploy preview.
