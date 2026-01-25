# Guía de Despliegue y Mantenimiento: WhatsApp Bot 🤖

Esta guía detalla los pasos necesarios para desplegar el bot en producción y asegurar su correcto funcionamiento a largo plazo.

## 🚀 Despliegue

### 1. Variables de Entorno

Asegúrate de que las siguientes variables estén configuradas en tu plataforma de hosting (ej. Vercel):

| Variable                   | Descripción                      | Fuente                |
| :------------------------- | :------------------------------- | :-------------------- |
| `WHATSAPP_TOKEN`           | Permanent Access Token           | Meta Developer Portal |
| `WHATSAPP_PHONE_ID`        | Phone Number ID                  | Meta Developer Portal |
| `WHATSAPP_VERIFY_TOKEN`    | Token de verificación (libre)    | Definido por ti       |
| `WHATSAPP_APP_SECRET`      | App Secret para seguridad HMAC   | Meta Developer Portal |
| `OPENAI_API_KEY`           | Key para inteligencia artificial | OpenAI Dashboard      |
| `UPSTASH_REDIS_REST_URL`   | URL de la base de datos Redis    | Upstash Console       |
| `UPSTASH_REDIS_REST_TOKEN` | Token de acceso Redis            | Upstash Console       |

### 2. Configuración en Meta for Developers

1. Ve a tu App > **WhatsApp** > **Configuration**.
2. **Callback URL:** `https://tu-dominio.com/api/v1/whatsapp`.
3. **Verify Token:** El valor que pusiste en `WHATSAPP_VERIFY_TOKEN`.
4. **Webhook Fields:** Suscríbete al campo `messages`.

## 🛠️ Mantenimiento

### Monitoreo de Leads

- Los leads calificados se guardan en Upstash Redis bajo la clave `lead:[TELEFONO]`.
- Puedes visualizar la lista completa con el set `all_leads`.

### Logs de Errores

- Revisa los logs de tu servidor para detectar errores de firma (`Invalid signature`) o fallos en las llamadas a OpenAI.
- Si el bot deja de responder, verifica que el **Permanent Access Token** de Meta no haya sido revocado.

### Refinamiento del Prompt

Si deseas que el bot cambie su comportamiento o califique leads de forma distinta, edita el `SYSTEM_PROMPT` en `src/lib/bot/ai-manager.ts`.

---

> [!TIP]
> **Handoff Humano:** Actualmente, el bot notifica a la consola. Para escalar, puedes conectar el `notification-manager.ts` con un webhook de Slack o un servicio de envío de Emails.

## Local Development & Troubleshooting

### Lazy Initialization (Modo Fallback)

Para facilitar el desarrollo del frontend sin necesidad de configurar todas las credenciales externas, el bot cuenta con un modo "tolerante a fallos":

- **Si falta `UPSTASH_REDIS_REST_URL`**: La persistencia de conversaciones se desactiva. El bot tratará cada mensaje como nuevo y no guardará contexto.
- **Si falta `OPENAI_API_KEY`**: El bot responderá con un mensaje por defecto indicando que está en modo desarrollo en lugar de crashear.

Esto permite levantar la aplicación con `npm run dev` incluso si el archivo `.env.local` está incompleto o vacío.
