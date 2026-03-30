import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/meta/whatsapp-client";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export class OutreachService {
  /**
   * Enrolls multiple leads into a campaign.
   */
  static async enrollLeads(campaignId: string, leadIds: string[]) {
    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) throw new Error("Campaign not found");

    const messages = await Promise.all(
      leadIds.map(async (leadId) => {
        // Check if already enrolled to avoid duplicates in the same campaign
        const exists = await prisma.outreachMessage.findFirst({
          where: { campaignId, leadId },
        });
        if (exists) return null;

        return prisma.outreachMessage.create({
          data: {
            campaignId,
            leadId,
            content: campaign.template || "Hola, nos gustaría contactarte.",
            status: "PENDING",
          },
        });
      }),
    );

    return messages.filter(Boolean);
  }

  /**
   * Processes all pending messages for a campaign.
   */
  static async processCampaign(campaignId: string) {
    const pendingMessages = await prisma.outreachMessage.findMany({
      where: { campaignId, status: "PENDING" },
    });

    for (const msg of pendingMessages) {
      await this.sendMessage(msg.id);
    }

    // Check if campaign is finished
    const remaining = await prisma.outreachMessage.count({
      where: { campaignId, status: "PENDING" },
    });

    if (remaining === 0) {
      await prisma.outreachCampaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED" },
      });
    }
  }

  /**
   * Sends a single message based on campaign channel.
   */
  static async sendMessage(messageId: string) {
    const msg = await prisma.outreachMessage.findUnique({
      where: { id: messageId },
      include: { lead: true, campaign: true },
    });

    if (!msg || !msg.lead) return;

    try {
      if (msg.campaign.channel === "WHATSAPP") {
        const phone = msg.lead.whatsapp || msg.lead.phone;
        if (!phone) throw new Error("Lead has no phone number");

        const result = await sendWhatsAppMessage(phone, msg.content);
        await prisma.outreachMessage.update({
          where: { id: messageId },
          data: {
            status: "SENT",
            externalId: result.messages?.[0]?.id,
            sentAt: new Date(),
          },
        });
      } else if (msg.campaign.channel === "EMAIL") {
        if (!msg.lead.email) throw new Error("Lead has no email address");
        if (!resend) throw new Error("Resend API Key missing");

        const fromEmail =
          process.env.SMTP_FROM_EMAIL || "no-reply@agencialeads.com";
        const { data, error } = await resend.emails.send({
          from: fromEmail,
          to: msg.lead.email,
          subject: msg.campaign.name,
          html: `<div style="font-family: sans-serif; white-space: pre-wrap;">${msg.content}</div>`,
        });

        if (error) throw error;

        await prisma.outreachMessage.update({
          where: { id: messageId },
          data: {
            status: "SENT",
            externalId: data?.id,
            sentAt: new Date(),
          },
        });
      }
    } catch (error: any) {
      console.error(`[OutreachService] Failed to send ${messageId}:`, error);
      await prisma.outreachMessage.update({
        where: { id: messageId },
        data: {
          status: "FAILED",
          error: error.message || "Unknown error",
        },
      });
    }
  }

  /**
   * Gets performance stats for a campaign.
   */
  static async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const stats = await prisma.outreachMessage.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { _all: true },
    });

    const result: CampaignStats = {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stats.forEach((s: any) => {
      const count = s._count._all;
      result.total += count;
      if (s.status === "SENT") result.sent += count;
      if (s.status === "DELIVERED") result.delivered += count;
      if (s.status === "READ") result.read += count;
      if (s.status === "FAILED") result.failed += count;
    });

    return result;
  }
}
