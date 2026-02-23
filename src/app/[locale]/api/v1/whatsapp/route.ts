import { NextRequest, NextResponse } from "next/server";
import { validateMetaSignature } from "@/lib/meta/signature-validator";
import { sendWhatsAppMessage } from "@/lib/meta/whatsapp-client";
import { updateConversationHistory } from "@/lib/bot/redis-context";
import { generateAIResponse, extractLeadData } from "@/lib/bot/ai-manager";
import { saveLead } from "@/lib/bot/lead-manager";
import { notifyQualifiedLead } from "@/lib/bot/notification-manager";
import { resolveTenantIdFromHeaders } from "@/lib/tenant-context";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

/**
 * GET Handler: Webhook Verification
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[Webhook] Verification failed");
  return new NextResponse("Verification failed", { status: 403 });
}

/**
 * POST Handler: Receive Messages
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = await checkRateLimit(`whatsapp-webhook:${ip}`, 120, 60);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";

    if (!validateMetaSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const activeTenantId = resolveTenantIdFromHeaders(
      new Headers(req.headers),
      process.env.DEFAULT_TENANT_ID,
    );

    const payload = JSON.parse(rawBody);
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0]?.value;

    if (!changes || (!changes.messages && !changes.statuses)) {
      return NextResponse.json({ status: "ok" });
    }

    const message = changes.messages?.[0];
    if (message) {
      const from = message.from;
      let body = "";

      if (message.type === "text") body = message.text.body;
      else if (message.type === "button") body = message.button.text;
      else if (message.type === "interactive") {
        const interactive = message.interactive;
        if (interactive.type === "button_reply")
          body = interactive.button_reply.title;
        else if (interactive.type === "list_reply")
          body = interactive.list_reply.title;
      }

      if (!body) return NextResponse.json({ status: "ok" });

      try {
        const history = []; // TODO: Implement tenant-scoped context
        const aiResponse = await generateAIResponse(body, history);

        const cleanResponse = aiResponse
          .replace(/\[QUALIFIED\]|\[DISQUALIFIED\]/g, "")
          .trim();
        await sendWhatsAppMessage(from, cleanResponse);

        await updateConversationHistory(from, { role: "user", content: body });
        await updateConversationHistory(from, {
          role: "assistant",
          content: aiResponse,
        });

        if (aiResponse.includes("[QUALIFIED]")) {
          const leadData = await extractLeadData(
            [
              ...history,
              { role: "user", content: body },
              { role: "assistant", content: aiResponse },
            ],
            from,
          );
          if (leadData) {
            const tenantLeadData = { ...leadData, tenantId: activeTenantId };
            await saveLead(tenantLeadData, activeTenantId);
            await notifyQualifiedLead(tenantLeadData);
          }
        }
      } catch (error) {
        console.error("[Webhook] Logic error:", error);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Webhook] Request error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
