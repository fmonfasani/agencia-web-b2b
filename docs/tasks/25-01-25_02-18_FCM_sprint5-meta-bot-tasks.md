# Tareas de Sprint 5: WhatsApp Bot (Control Meta API)

**Proyecto:** Agencia Web B2B  
**Iniciado por:** Fede (FCM)  
**Tipo:** Backend + DevOps

---

## Day 1: Meta Setup & Auth

- [ ] Crear App en **Meta Developers** (Tipo de Business).
- [ ] Configurar **WhatsApp Product** y obtener `PHONE_NUMBER_ID` y `WABA_ID`.
- [ ] Generar **Permanent Access Token** (System User).
- [ ] Configurar variables de entorno en `.env.local`:
  - `WHATSAPP_TOKEN`
  - `WHATSAPP_PHONE_ID`
  - `WHATSAPP_VERIFY_TOKEN` (inventado por nosotros)
  - `WHATSAPP_APP_SECRET`

## Day 2: Webhook Live Verification

- [ ] Implementar `GET /api/v1/whatsapp` para validación oficial de Meta.
- [ ] Implementar base del `POST /api/v1/whatsapp` para recibir notificaciones en crudo.
- [ ] Implementar validador de firma `x-hub-signature-256` (Seguridad total).
- [ ] Testear conexión exitosa con el validador de Meta.

## Day 3: Message Processing Engine

- [ ] Parsear la estructura de Meta (extracción de `from`, `name` y `text`).
- [ ] Crear `src/lib/meta/whatsapp-client.ts` para enviar respuestas (`POST` a Graph API).
- [ ] Implementar "Echo Bot" directo desde nuestro servidor para probar latencia.

## Day 4: AI Intelligent Conversational Layer

- [ ] Integrar Gemini/OpenAI con un prompt especializado en B2B.
- [ ] Implementar persistencia de hilos de conversación en **Redis** para mantener el hilo del chat.
- [ ] Diseñar el flujo: Saludo -> Pregunta servicios -> Calificación de urgencia.

## Day 5: Lead Qualification & Real-time Alerts

- [ ] Implementar extracción de campos (Email, Empresa, Presupuesto) desde el chat AI.
- [ ] Configurar notificaciones vía **Slack** o **Email** cuando se califica un lead.
- [ ] Implementar el "Handoff" (pausa del bot ante intervención humana).

## Day 6: Advanced Meta Features

- [ ] Implementar **Quick Replies** y **Botones** interactivos (UI nativa de WhatsApp).
- [ ] Crear templates de mensajes para iniciar conversaciones oficiales (Marketing/Servicio).
- [ ] Testing intensivo de fallos y manejo de caracteres especiales.

## Day 7: Final QA & Handover

- [ ] Documentar comandos de mantenimiento.
- [ ] Subida a producción y verificación de logs en consola.
- [ ] Walkthrough final de la integración directa.

---

**Documento generado:** 25-01-25 02:18 AM (ART)  
**Versión:** 2.0 (Meta Direct)
