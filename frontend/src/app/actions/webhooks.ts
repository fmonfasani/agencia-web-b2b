"use server";

export type WebhookEvent =
  | "agent.query.executed"
  | "agent.status.changed"
  | "subscription.created"
  | "subscription.cancelled"
  | "payment.failed"
  | "usage.threshold_exceeded";

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  status: "active" | "inactive";
  lastFiredAt?: string;
  createdAt: string;
  successCount: number;
  failCount: number;
}

export interface WebhookLog {
  id: string;
  event: WebhookEvent;
  status: "success" | "failed";
  statusCode?: number;
  timestamp: string;
  duration: number;
}

const mockWebhooks: Webhook[] = [
  {
    id: "wh1",
    name: "Producción - Alertas",
    url: "https://api.miempresa.com/webhooks/webshooks",
    events: ["agent.query.executed", "payment.failed"],
    status: "active",
    lastFiredAt: "2026-04-06T10:23:00Z",
    createdAt: "2026-02-15",
    successCount: 1243,
    failCount: 2,
  },
  {
    id: "wh2",
    name: "Slack - Notificaciones",
    url: "https://hooks.slack.com/services/T00/B00/xxx",
    events: ["subscription.created", "subscription.cancelled"],
    status: "active",
    lastFiredAt: "2026-04-05T15:10:00Z",
    createdAt: "2026-03-01",
    successCount: 45,
    failCount: 0,
  },
];

const mockLogs: WebhookLog[] = [
  { id: "l1", event: "agent.query.executed", status: "success", statusCode: 200, timestamp: "2026-04-06T10:23:00Z", duration: 123 },
  { id: "l2", event: "payment.failed", status: "success", statusCode: 200, timestamp: "2026-04-06T09:10:00Z", duration: 89 },
  { id: "l3", event: "agent.query.executed", status: "failed", statusCode: 500, timestamp: "2026-04-05T22:00:00Z", duration: 5000 },
];

export async function getWebhooks(): Promise<Webhook[]> {
  return mockWebhooks;
}

export async function createWebhook(
  name: string,
  url: string,
  events: WebhookEvent[]
): Promise<{ success: boolean; data?: Webhook; error?: string }> {
  if (!url.startsWith("https://")) return { success: false, error: "URL debe usar HTTPS" };
  if (events.length === 0) return { success: false, error: "Selecciona al menos un evento" };

  const wh: Webhook = {
    id: `wh_${Date.now()}`,
    name,
    url,
    events,
    status: "active",
    createdAt: new Date().toISOString().split("T")[0],
    successCount: 0,
    failCount: 0,
  };
  return { success: true, data: wh };
}

export async function testWebhook(
  webhookId: string
): Promise<{ success: boolean; response?: string; latency?: number; error?: string }> {
  // Simula envío de payload de prueba
  await new Promise((r) => setTimeout(r, 800));
  return { success: true, response: '{"received": true}', latency: 124 };
}

export async function deleteWebhook(
  webhookId: string
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function getWebhookLogs(webhookId: string): Promise<WebhookLog[]> {
  return mockLogs;
}

export const ALL_WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "agent.query.executed", label: "Query ejecutada" },
  { value: "agent.status.changed", label: "Estado del agente cambia" },
  { value: "subscription.created", label: "Suscripción creada" },
  { value: "subscription.cancelled", label: "Suscripción cancelada" },
  { value: "payment.failed", label: "Pago fallido" },
  { value: "usage.threshold_exceeded", label: "Límite de uso superado" },
];
