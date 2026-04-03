# Repository Audit & Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar todas las carpetas, archivos y elementos sin uso del repositorio para pushear código limpio a VPS.

**Architecture:** El proyecto activo consiste en dos servicios Python (`backend-saas` y `backend-agents`) coordinados por `docker-compose.prod.yml`. Todo lo demás son artefactos de iteraciones anteriores (microservicios viejos, scripts de migración, backups, librerías Claude experimentales) que no forman parte del stack actual.

**Tech Stack:** bash, git (para removes + commit), .gitignore

---

## Mapa de Archivos a Tocar

| Acción | Ruta |
|--------|------|
| DELETE dir | `_archived_scripts/` |
| DELETE dir | `_migration_backup_20260323_150733/` |
| DELETE dir | `_migration_backup_20260323_151358/` |
| DELETE dir | `agent-service/` |
| DELETE dir | `intelligence_engine/` |
| DELETE dir | `agents-platform/` |
| DELETE dir | `ai-finobs-claude/` |
| DELETE dir | `ai-lead-gen-claude/` |
| DELETE dir | `ai-marketing-claude/` |
| DELETE dir | `auditor/` |
| DELETE dir | `lead-system/` |
| DELETE dir | `RAG/` |
| DELETE dir | `Strategy/` |
| DELETE dir | `benchmarks/` |
| DELETE dir | `mcp-servers/` |
| DELETE dir | `revisar/` |
| DELETE dir | `.md/` |
| DELETE dir | `__pycache__/` (raíz) |
| DELETE file | `backend-agents-main.py.template` |
| DELETE file | `bridge-server.js` |
| DELETE file | `benchmark_ollama.py` |
| DELETE file | `ecosystem.config.js` |
| DELETE file | `ollama_router_memoria.py` |
| DELETE file | `run_daily.py` |
| DELETE file | `DECOUPLING_REPORT.json` |
| DELETE file | `test_doc.txt` |
| DELETE file | `"files (1).zip"` |
| DELETE file | `mcp_config_template.json` |
| DELETE file | `lighthouserc.json` |
| DELETE file | `docker-compose.yml` (root, reemplazado por prod + local) |
| DELETE scripts | `scripts/backend_fix_all.ps1` |
| DELETE scripts | `scripts/backfill-leads-tenant.mjs` |
| DELETE scripts | `scripts/backfill-leads-v2.mjs` |
| DELETE scripts | `scripts/check-users.mjs` |
| DELETE scripts | `scripts/create-admin.mjs` |
| DELETE scripts | `scripts/db-auth-audit.sql` |
| DELETE scripts | `scripts/db-normalize-emails.sql` |
| DELETE scripts | `scripts/debug-prisma.mjs` |
| DELETE scripts | `scripts/deploy-vps.ps1` |
| DELETE scripts | `scripts/deploy-vps.sh` |
| DELETE scripts | `scripts/fix-pr-setup.sh` |
| DELETE scripts | `scripts/husky.sh` |
| DELETE scripts | `scripts/migrate-simple.ps1` |
| DELETE scripts | `scripts/migrate-to-separate-architecture.ps1` |
| DELETE scripts | `scripts/pre-deploy-auth-validate.sh` |
| DELETE scripts | `scripts/qa_auth_flow.sh` |
| DELETE scripts | `scripts/reset-admin.mjs` |
| DELETE scripts | `scripts/reset-password.mjs` |
| DELETE scripts | `scripts/run.ps1` |
| DELETE scripts | `scripts/seed-webshooks.mjs` |
| DELETE scripts | `scripts/test-login.mjs` |
| DELETE scripts | `scripts/test-prisma.mjs` |
| DELETE scripts | `scripts/verify-env.mjs` |
| MODIFY | `.gitignore` |
| KEEP | `backend-saas/` |
| KEEP | `backend-agents/` |
| KEEP | `docker-compose.prod.yml` |
| KEEP | `docker-compose.local.yml` |
| KEEP | `scripts/init-db.sql` |
| KEEP | `scripts/nginx.conf` |
| KEEP | `scripts/deploy-prod.sh` |
| KEEP | `scripts/backup.sh` |
| KEEP | `scripts/healthcheck.sh` |
| KEEP | `scripts/setup-vps.sh` |
| KEEP | `scripts/seed-prod.sh` |
| KEEP | `scripts/preflight-check.sh` |
| KEEP | `scripts/test-e2e.sh` |
| KEEP | `scripts/logrotate.conf` |
| KEEP | `scripts/PRODUCTION-CHECKLIST.md` |
| KEEP | `frontend/` (Next.js app, parte del producto) |
| KEEP | `docs/` |
| KEEP | `tests/` |
| KEEP | `Guia-paso-a-paso-swagger.md` |

---

## Task 1: Actualizar .gitignore antes de borrar

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Verificar estado actual del .gitignore**

```bash
cat .gitignore
```

Expected: ver reglas actuales, confirmar que `venv/`, `__pycache__/`, `.env.production` no están.

- [ ] **Step 2: Agregar las reglas faltantes al .gitignore**

Agregar al final del archivo `.gitignore`:

```gitignore

# Python
__pycache__/
*.pyc
*.pyo
.pytest_cache/
venv/
*.egg-info/

# Node / frontend
node_modules/
*.tsbuildinfo
frontend/.next/
frontend/out/
frontend/node_modules/

# Env de producción (nunca commitear)
.env.production
backend-saas/.env.production
backend-agents/.env.production

# Logs y datos de runtime
backend-agents/logs/
backend-agents/openrouter_usage.json
*.log

# Uploads (archivos de tenants — no van al repo)
backend-saas/uploads/
uploads/

# Archivos comprimidos subidos por tenants / artefactos
*.zip
test-results/
playwright-report/
```

- [ ] **Step 3: Verificar que las reglas son correctas**

```bash
git check-ignore -v venv/ backend-agents/logs/ backend-saas/uploads/
```

Expected: cada línea muestra qué regla de `.gitignore` aplica.

- [ ] **Step 4: Commit del .gitignore actualizado**

```bash
git add .gitignore
git commit -m "chore: update .gitignore — add python/node/env/upload patterns"
```

---

## Task 2: Eliminar servicios viejos completos

Estos son microservicios de iteraciones anteriores, completamente reemplazados por `backend-agents/` y `backend-saas/`. No tienen importaciones cruzadas con el código activo.

**Files:**
- Delete dirs: `agent-service/`, `intelligence_engine/`, `agents-platform/`, `ai-finobs-claude/`, `ai-lead-gen-claude/`, `ai-marketing-claude/`, `auditor/`, `lead-system/`

- [ ] **Step 1: Confirmar que ningún servicio activo importa estos directorios**

```bash
grep -r "agent-service\|intelligence_engine\|agents-platform\|ai-finobs-claude\|ai-lead-gen-claude\|auditor\|lead-system" backend-saas/ backend-agents/ docker-compose.prod.yml docker-compose.local.yml 2>/dev/null
```

Expected: sin resultados (0 matches). Si hay matches, NO borrar ese directorio hasta investigar.

- [ ] **Step 2: Eliminar los servicios viejos del índice git y del disco**

```bash
git rm -r --cached agent-service/ intelligence_engine/ agents-platform/ ai-finobs-claude/ ai-lead-gen-claude/ ai-marketing-claude/ auditor/ lead-system/
rm -rf agent-service/ intelligence_engine/ agents-platform/ ai-finobs-claude/ ai-lead-gen-claude/ ai-marketing-claude/ auditor/ lead-system/
```

- [ ] **Step 3: Verificar que desaparecieron**

```bash
ls -d agent-service/ intelligence_engine/ agents-platform/ ai-finobs-claude/ ai-lead-gen-claude/ ai-marketing-claude/ auditor/ lead-system/ 2>&1
```

Expected: `ls: cannot access...` para todos.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove legacy microservices — agent-service, intelligence_engine, agents-platform, ai-*-claude, auditor, lead-system"
```

---

## Task 3: Eliminar backups y directorios de artefactos

**Files:**
- Delete dirs: `_archived_scripts/`, `_migration_backup_20260323_150733/`, `_migration_backup_20260323_151358/`, `RAG/`, `Strategy/`, `benchmarks/`, `mcp-servers/`, `revisar/`, `.md/`, `__pycache__/`

- [ ] **Step 1: Confirmar que estos directorios no están referenciados en docker-compose activo**

```bash
grep -E "_archived_scripts|_migration_backup|^  RAG|^  Strategy|benchmarks|mcp-servers|revisar" docker-compose.prod.yml docker-compose.local.yml 2>/dev/null
```

Expected: sin resultados.

- [ ] **Step 2: Eliminar del índice git y del disco**

```bash
git rm -r --cached _archived_scripts/ _migration_backup_20260323_150733/ _migration_backup_20260323_151358/ RAG/ Strategy/ benchmarks/ mcp-servers/ revisar/ .md/ __pycache__/ 2>/dev/null || true
rm -rf _archived_scripts/ "_migration_backup_20260323_150733/" "_migration_backup_20260323_151358/" RAG/ Strategy/ benchmarks/ mcp-servers/ revisar/ .md/ __pycache__/
```

- [ ] **Step 3: Verificar**

```bash
ls _archived_scripts/ RAG/ revisar/ .md/ 2>&1
```

Expected: errores de "no such file or directory" para todos.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove archived scripts, migration backups, RAG prototypes, benchmarks, review folders"
```

---

## Task 4: Eliminar archivos sueltos de raíz sin uso

**Files:**
- Delete files en raíz: `backend-agents-main.py.template`, `bridge-server.js`, `benchmark_ollama.py`, `ecosystem.config.js`, `ollama_router_memoria.py`, `run_daily.py`, `DECOUPLING_REPORT.json`, `test_doc.txt`, `files (1).zip`, `mcp_config_template.json`, `lighthouserc.json`, `docker-compose.yml`

- [ ] **Step 1: Verificar que docker-compose.yml de raíz no es el que usa VPS**

```bash
head -5 docker-compose.yml
```

Expected: ver que tiene `POSTGRES_PASSWORD: Karaoke27570Echeverria` hardcodeado y/o no tiene todos los servicios del stack actual. El archivo de producción es `docker-compose.prod.yml`.

- [ ] **Step 2: Eliminar archivos sueltos**

```bash
git rm --cached backend-agents-main.py.template bridge-server.js benchmark_ollama.py ecosystem.config.js ollama_router_memoria.py run_daily.py DECOUPLING_REPORT.json test_doc.txt mcp_config_template.json lighthouserc.json docker-compose.yml 2>/dev/null || true
rm -f backend-agents-main.py.template bridge-server.js benchmark_ollama.py ecosystem.config.js ollama_router_memoria.py run_daily.py DECOUPLING_REPORT.json test_doc.txt mcp_config_template.json lighthouserc.json docker-compose.yml "files (1).zip"
```

- [ ] **Step 3: Verificar que los archivos activos de raíz siguen presentes**

```bash
ls docker-compose.prod.yml docker-compose.local.yml Guia-paso-a-paso-swagger.md .gitignore
```

Expected: los cuatro archivos listados sin error.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove unused root files — templates, old configs, benchmark scripts, zip artifacts"
```

---

## Task 5: Limpiar directorio scripts/

Los scripts `.mjs` y `.ps1` son de la arquitectura anterior (Prisma + Next.js + VPS con PM2). El stack actual usa Docker en VPS, con scripts bash.

**Files:**
- Delete: 16 scripts en `scripts/` (listados abajo)
- Keep: los 10 scripts bash activos

- [ ] **Step 1: Verificar cuáles scripts bash son los activos**

```bash
ls scripts/*.sh scripts/*.sql scripts/*.conf scripts/*.md 2>/dev/null
```

Expected: ver `init-db.sql`, `nginx.conf`, `deploy-prod.sh`, `backup.sh`, `healthcheck.sh`, `setup-vps.sh`, `seed-prod.sh`, `preflight-check.sh`, `test-e2e.sh`, `logrotate.conf`, `PRODUCTION-CHECKLIST.md`.

- [ ] **Step 2: Eliminar scripts de arquitectura antigua**

```bash
git rm --cached scripts/backend_fix_all.ps1 scripts/backfill-leads-tenant.mjs scripts/backfill-leads-v2.mjs scripts/check-users.mjs scripts/create-admin.mjs scripts/db-auth-audit.sql scripts/db-normalize-emails.sql scripts/debug-prisma.mjs scripts/deploy-vps.ps1 scripts/deploy-vps.sh scripts/fix-pr-setup.sh scripts/husky.sh scripts/migrate-simple.ps1 scripts/migrate-to-separate-architecture.ps1 scripts/pre-deploy-auth-validate.sh scripts/qa_auth_flow.sh scripts/reset-admin.mjs scripts/reset-password.mjs scripts/run.ps1 scripts/seed-webshooks.mjs scripts/test-login.mjs scripts/test-prisma.mjs scripts/verify-env.mjs 2>/dev/null || true
rm -f scripts/backend_fix_all.ps1 scripts/backfill-leads-tenant.mjs scripts/backfill-leads-v2.mjs scripts/check-users.mjs scripts/create-admin.mjs scripts/db-auth-audit.sql scripts/db-normalize-emails.sql scripts/debug-prisma.mjs scripts/deploy-vps.ps1 scripts/deploy-vps.sh scripts/fix-pr-setup.sh scripts/husky.sh scripts/migrate-simple.ps1 scripts/migrate-to-separate-architecture.ps1 scripts/pre-deploy-auth-validate.sh scripts/qa_auth_flow.sh scripts/reset-admin.mjs scripts/reset-password.mjs scripts/run.ps1 scripts/seed-webshooks.mjs scripts/test-login.mjs scripts/test-prisma.mjs scripts/verify-env.mjs
```

- [ ] **Step 3: Verificar que quedan solo los scripts activos**

```bash
ls scripts/
```

Expected: solo estos archivos: `PRODUCTION-CHECKLIST.md`, `backup.sh`, `deploy-prod.sh`, `healthcheck.sh`, `init-db.sql`, `logrotate.conf`, `nginx.conf`, `preflight-check.sh`, `seed-prod.sh`, `setup-vps.sh`, `test-e2e.sh`.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove legacy scripts — Prisma mjs, PowerShell, old VPS deploy scripts"
```

---

## Task 6: Eliminar venv/ y __pycache__ del tracking de git (si estaban trackeados)

- [ ] **Step 1: Verificar si venv o caches están en el índice git**

```bash
git ls-files venv/ __pycache__/ backend-agents/__pycache__/ backend-saas/__pycache__/ 2>/dev/null | head -20
```

Expected: si hay output, esos archivos están trackeados y hay que removerlos.

- [ ] **Step 2: Si hay output en Step 1, remover del índice (no del disco)**

```bash
git rm -r --cached venv/ __pycache__/ 2>/dev/null || true
find . -name "__pycache__" -not -path "./.git/*" | xargs git rm -r --cached 2>/dev/null || true
find . -name "*.pyc" -not -path "./.git/*" | xargs git rm --cached 2>/dev/null || true
```

- [ ] **Step 3: Verificar que .gitignore protege estas rutas**

```bash
git check-ignore -v venv/ backend-agents/app/__pycache__/
```

Expected: ambas rutas ignoradas por `.gitignore`.

- [ ] **Step 4: Commit si hubo cambios**

```bash
git status --short | grep "^D " | head -5
# Si hay archivos removidos:
git commit -m "chore: untrack venv and __pycache__ from git index"
```

---

## Task 7: Verificar estado final limpio

- [ ] **Step 1: Revisar git status**

```bash
git status
```

Expected: solo archivos trackeados que son parte del stack activo. No debe aparecer ningún directorio de la lista DELETE del mapa de archivos.

- [ ] **Step 2: Revisar el árbol de directorios activos**

```bash
ls -la
```

Expected: ver solo:
```
.agents/          (skills del sistema, ok)
.claude/          (worktrees de claude code, ok)
.codex/           (skills del sistema, ok)
.git/             (git interno, ok)
.gitignore        ✅
.husky/           (git hooks, ok)
Guia-paso-a-paso-swagger.md  ✅
backend-agents/   ✅
backend-saas/     ✅
docker-compose.local.yml  ✅
docker-compose.prod.yml   ✅
docs/             ✅
frontend/         ✅
package.json      (playwright para e2e, ok)
package-lock.json (ok)
scripts/          ✅
tests/            ✅
```

- [ ] **Step 3: Hacer dry-run de lo que se subiría al push**

```bash
git diff --name-only HEAD~5..HEAD | sort
```

Expected: ver solo cambios en archivos del stack activo + los removes de archivos viejos.

- [ ] **Step 4: Verificar que docker-compose.prod.yml sigue correcto**

```bash
grep "backend-saas\|backend-agents\|postgres\|qdrant\|redis\|ollama" docker-compose.prod.yml | head -20
```

Expected: los 6 servicios del stack presentes.

- [ ] **Step 5: Commit final de limpieza si quedan cambios**

```bash
git add -A
git status  # revisar qué hay staged
git commit -m "chore: final cleanup — repo audit complete, only active stack remains"
```

---

## Task 8: Verificar que frontend/ tiene su propio .gitignore

El directorio `frontend/` tiene su propio `node_modules/` que no debe subirse al repo.

- [ ] **Step 1: Verificar si frontend/node_modules está trackeado**

```bash
git ls-files frontend/node_modules/ 2>/dev/null | head -5
```

Expected: sin output (si está trackeado, habrá archivos listados — eso es un problema).

- [ ] **Step 2: Si está trackeado, remover del índice**

```bash
git rm -r --cached frontend/node_modules/ 2>/dev/null || echo "ya no trackeado"
```

- [ ] **Step 3: Verificar que el .gitignore raíz cubre frontend/node_modules/**

```bash
git check-ignore -v frontend/node_modules/
```

Expected: ignorado por la regla `node_modules/` o `frontend/node_modules/` del `.gitignore`.

- [ ] **Step 4: Commit si hubo cambios**

```bash
# Solo si el Step 2 tuvo cambios:
git commit -m "chore: untrack frontend/node_modules from git"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Buscar carpetas y archivos sin uso → Tasks 2, 3, 4, 5 cubren todos los directorios y archivos identificados
- ✅ Limpiar código viejo → Tasks 2-5 eliminan todo lo que no pertenece al stack activo
- ✅ Agregar a .gitignore lo que no se debe commitear → Task 1
- ✅ Push limpio a VPS → Task 7 verifica estado final
- ✅ Verificación de cada paso → Cada task tiene Step de verificación con expected output

**2. Placeholder scan:** Ningún paso dice "TBD" o "appropriate". Cada paso tiene comando exacto y expected output.

**3. Type consistency:** No aplica (no hay código, solo operaciones de archivo).

**Nota importante:** Antes de ejecutar Task 2, verificar el Step 1 de grep. Si algún directorio "viejo" tiene referencias en código activo, NO borrarlo hasta investigar.
