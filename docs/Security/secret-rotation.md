# Secret Rotation Checklist
> Última actualización: 2026-04-10

Rotar inmediatamente si algún secreto fue expuesto en el historial del repositorio, logs, capturas de pantalla o acceso no autorizado.

---

## Secretos a Rotar

### Frontend (Next.js)
| Variable | Dónde Rotarla |
|---|---|
| `NEXTAUTH_SECRET` | Generar nuevo con `openssl rand -base64 32` → `.env.local` |
| `AUTH_SECRET` | Igual que NEXTAUTH_SECRET |
| `AUTH_GOOGLE_CLIENT_SECRET` | Google Cloud Console → APIs → OAuth 2.0 |
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `DATABASE_URL` | Cambiar contraseña PostgreSQL → actualizar en todos los servicios |
| `POSTGRES_PRISMA_URL` | Igual que DATABASE_URL |
| `POSTGRES_URL_NON_POOLING` | Igual que DATABASE_URL |
| `MERCADOPAGO_ACCESS_TOKEN` | mercadopago.com.ar → Tus integraciones |
| `MERCADOPAGO_PUBLIC_KEY` | Igual que ACCESS_TOKEN |
| `SENTRY_AUTH_TOKEN` | sentry.io → Settings → Auth Tokens |
| `RESEND_API_KEY` | resend.com → API Keys |
| `ADMIN_SECRET` | Regenerar y actualizar en todos los consumidores |
| `INTERNAL_API_SECRET` | Idem |

### Backend SaaS (Python / FastAPI)
| Variable | Dónde Rotarla |
|---|---|
| `DATABASE_URL` / `POSTGRES_PASSWORD` | `ALTER USER postgres PASSWORD 'nuevo';` → actualizar `.env` |
| Claves de API de clientes (`wh_xxxxx`) | `POST /auth/rotate-key` con su API key activa |

### Backend Agents (Python / FastAPI)
| Variable | Dónde Rotarla |
|---|---|
| `DATABASE_URL` | Misma acción que SaaS |
| `OPENROUTER_API_KEYS` | openrouter.ai → Keys → Crear nueva / revocar vieja |

### Infra / Docker
| Variable | Dónde Rotarla |
|---|---|
| `REDIS_PASSWORD` | Cambiar en `docker-compose.prod.yml` → `REDIS_PASSWORD=nuevo` → recrear container |
| `POSTGRES_PASSWORD` | Ver DATABASE_URL arriba |

---

## Procedimiento de Rotación

1. Generar nuevo valor en el proveedor correspondiente.
2. Actualizar en el gestor de secretos (`.env` en dev, variables de entorno en prod).
3. Revocar la credencial vieja en el proveedor.
4. Reiniciar los servicios afectados para que levanten el nuevo valor:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend-saas backend-agents
   ```
5. Verificar healthchecks y tests de integración.
6. Registrar fecha de rotación y responsable en el log de incidentes.

---

## Rotación de API Keys de clientes (wh_xxxxx)

El sistema tiene un endpoint dedicado:

```bash
curl -X POST http://localhost:8000/auth/rotate-key \
  -H "X-API-Key: wh_xxxxx_key_actual"
```

Respuesta:
```json
{
  "api_key": "wh_yyyyy_nueva_key",
  "mensaje": "API Key rotada exitosamente. Tu key anterior ya no es válida."
}
```

La key anterior queda inválida inmediatamente. El cliente debe actualizar su integración.

---

## Historial Git

Si se detecta que una credencial fue commiteada en el historial:

1. Rotar inmediatamente (el secreto está comprometido desde el momento del commit).
2. Limpiar el historial con **BFG Repo Cleaner**:
   ```bash
   bfg --replace-text passwords.txt repo.git
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push --force
   ```
3. Notificar a todos los colaboradores para que hagan `git pull --rebase`.

> Ver también: `docs/task.md` — ítem pendiente "BFG Repo Cleaner".
