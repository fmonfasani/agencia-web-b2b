import { NextRequest, NextResponse } from "next/server";
import { validateMetaSignature } from "@/lib/meta/signature-validator";
import { sendWhatsAppMessage } from "@/lib/meta/whatsapp-client";
import {
  getConversationHistory,
  updateConversationHistory,
} from "@/lib/bot/redis-context";
import { generateAIResponse, extractLeadData } from "@/lib/bot/ai-manager";
import { saveLead } from "@/lib/bot/lead-manager";
import { notifyQualifiedLead } from "@/lib/bot/notification-manager";

/**
 * GET Handler: Webhook Verification
 * This is used by Meta to verify our webhook URL during setup.
 * Official Docs: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Verify token matches our environment variable
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[Webhook] Verification failed: Tokens do not match");
  return new NextResponse("Verification failed", { status: 403 });
}

/**
 * POST Handler: Receive Messages
 * This is where Meta sends all WhatsApp events (messages, status updates, etc).
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";

    // 1. Validate Signature (Security)
    if (!validateMetaSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // 2. Log payload for debugging (Remover en prod)
    console.log(
      "[Webhook] Received Meta payload:",
      JSON.stringify(payload, null, 2),
    );

    // 3. Early return for non-message updates (statuses, delivery receipts, etc)
    // We only care about messages for the bot logic at this stage.
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0]?.value;

    if (!changes || (!changes.messages && !changes.statuses)) {
      return NextResponse.json({ status: "ok" });
    }

    // 3. Process the message
    const message = changes.messages?.[0];

    if (message) {
      const from = message.from;
      let body = "";

      // Handle Text messages
      if (message.type === "text") {
        body = message.text.body;
      }
      // Handle Interactive messages (Buttons/Lists)
      else if (message.type === "interactive") {
        const interactive = message.interactive;
        if (interactive.type === "button_reply") {
          body = interactive.button_reply.title;
        } else if (interactive.type === "list_reply") {
          body = interactive.list_reply.title;
        }
      }

      if (!body) return NextResponse.json({ status: "ok" });

      console.log(`[Webhook] Message from ${from}: ${body}`);

      try {
        // 1. Get history
        const history = await getConversationHistory(from);

        // 2. Generate AI response
        const aiResponse = await generateAIResponse(history, body);

        // 3. Send message back (Removiendo el tag de control para el usuario final)
        const cleanResponse = aiResponse
          .replace(/\[QUALIFIED\]|\[DISQUALIFIED\]/g, "")
          .trim();
        await sendWhatsAppMessage(from, cleanResponse);

        // 4. Update history
        await updateConversationHistory(from, { role: "user", content: body });
        await updateConversationHistory(from, {
          role: "assistant",
          content: aiResponse,
        });

        // 5. Check for qualification
        if (aiResponse.includes("[QUALIFIED]")) {
          console.log(
            `[Webhook] Lead Qualified: ${from}. Triggering extraction...`,
          );
          const leadData = await extractLeadData(
            [
              ...history,
              { role: "user", content: body },
              { role: "assistant", content: aiResponse },
            ],
            from,
          );
          if (leadData) {
            await saveLead(leadData);
            await notifyQualifiedLead(leadData);
          }
        }
      } catch (error) {
        console.error("[Webhook] Failed to process message logic:", error);
        await sendWhatsAppMessage(
          from,
          "Lo siento, tuve un problema técnico. ¿Podrías intentar de nuevo?",
        );
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Webhook] Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
