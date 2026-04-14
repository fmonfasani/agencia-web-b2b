# Diagnóstico runtime E2E — 2026-04-14

## Evidencia de ejecución real

### 1) Probe HTTP de servicios locales

Se ejecutaron probes directos:

- `http://localhost:8000/health`
- `http://localhost:8000/agent-templates`
- `http://localhost:8000/agent-instances`
- `http://localhost:8000/tenant/me`
- `http://localhost:8001/health`
- `http://localhost:8001/agent/execute`
- `http://localhost:8001/agent/metrics`

Resultado: todos devolvieron `HTTP_STATUS:000` con `curl: (7) Couldn't connect to server`.

### 2) Intento de arranque backend-saas

Comando: `cd backend-saas && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`

Resultado real: crash en import con excepción fatal:

- `RuntimeError: DATABASE_URL environment variable is required. Set it in your .env file or deployment config.`

### 3) Intento de arranque backend-agents

Comando: `cd backend-agents && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001`

Resultado real: crash en import con excepción fatal:

- `RuntimeError: DATABASE_URL environment variable is required. Set it in your .env file or deployment config.`

## Hallazgos de integración (código vs runtime)

- El frontend de `/app/agents` usa `Promise.allSettled` para pedir instancias + templates. Si una llamada falla, la UI puede quedar parcialmente renderizada sin exponer error bloqueante al usuario.
- El cliente `saas-client` (usado desde componentes client-side) toma `process.env.AGENT_SERVICE_URL` (no `NEXT_PUBLIC_*`). En browser normalmente será `undefined` y cae a `http://localhost:8000`.
- `backend-agents` expone métricas en `GET /metrics/agent` y ejecución en `POST /agent/execute` (no `GET`).
- El probe pedido `GET /agent/metrics` en backend-agents no coincide con el endpoint implementado.

## Conclusión operacional

El sistema no está operativo en este runtime: ambos backends están caídos por configuración crítica faltante (`DATABASE_URL`), por lo que frontend no puede reflejar cambios aunque estén implementados en código.
