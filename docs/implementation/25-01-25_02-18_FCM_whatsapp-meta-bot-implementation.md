# Plan de Implementación: WhatsApp Meta API (Sprint 5)

**Proyecto:** Agencia Web B2B  
**Fecha:** 25 de Enero, 2026  
**Documento:** 25-01-25_02-18_FCM_whatsapp-meta-bot-implementation.md

---

## 🛠️ Stack Tecnológico de Control Total

- **API:** Meta WhatsApp Cloud API (Graph API v21.0+).
- **Backend:** Next.js Route Handlers (`POST` para webhooks, `GET` para verificación).
- **Security:** Validaciones HMAC SHA256 de las firmas de Meta (`x-hub-signature-256`).
- **State Management:** Redis (Upstash) para control de flujo de conversación sin estado.
- **AI Core:** LangChain + Gemini/OpenAI para flujos conversacionales dinámicos.

---

## 📋 Arquitectura de Webhooks

### 1. Verificación del Webhook (`GET`)

Validación del token de configuración exigido por Meta Developers.

```typescript
// URL: /api/v1/whatsapp
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
// Requerido para conectar la app de Meta con nuestro servidor
```

### 2. Procesamiento de Mensajes (`POST`)

Manejo de la estructura compleja de Meta (contacts, messages, status).

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [{ "from": "54...", "text": { "body": "Hola!" } }]
          }
        }
      ]
    }
  ]
}
```

---

## 🏗️ Estructura de Clases y Librerías

### `src/lib/meta/whatsapp-api.ts`

- Función `sendMessage(to, text)` usando `fetch` directo a `graph.facebook.com`.
- Soporte para templates dinámicos y botones interactivos.

### `src/lib/meta/signature-validator.ts`

- MiddleWare para verificar que los paquetes realmente vienen de Meta usando la `APP_SECRET`.

### `src/lib/bot/lead-qualifier.ts`

- Lógica AI para detectar:
  - **Nivel de Presupuesto**
  - **Urgencia del Proyecto**
  - **Tipo de Servicio B2B solicitado**

---

## 🧪 Plan de Verificación

1.  **Meta Webhook Tool:** Simulación de requests desde el panel de Meta.
2.  **Ngrok Testing:** Servir el endpoint local para recibir mensajes reales.
3.  **Chatbot Sandbox:** Verificación de flujos automatizados (bienvenida -> preguntas -> calificación).
4.  **Error Handling:** Manejo de duplicidad de mensajes de Meta (retry policy).

---

**Documento generado:** 25-01-25 02:18 AM (ART)  
**Autor:** Antigravity AI  
**Versión:** 2.0 (Direct Integration)
