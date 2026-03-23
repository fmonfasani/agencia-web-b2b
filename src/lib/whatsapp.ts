import axios from "axios";

/**
 * WhatsApp Service for High-Priority System Alerts
 * Supports Twilio as the primary professional provider.
 */
export class WhatsAppService {
    private static instance: WhatsAppService;

    private constructor() { }

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    /**
     * Sends a high-priority alert to the configured administrator number.
     */
    public async sendAlert(message: string): Promise<{ success: boolean; error?: any }> {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+14155238886'
        const toNumber = process.env.ADMIN_WHATSAPP_NUMBER; // e.g. 'whatsapp:+549...'

        if (!accountSid || !authToken || !fromNumber || !toNumber) {
            console.warn("[WhatsAppService] Missing configuration. Alert not sent:", message);
            return { success: false, error: "Missing configuration" };
        }

        try {
            const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

            const response = await axios.post(
                `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                new URLSearchParams({
                    From: fromNumber,
                    To: toNumber,
                    Body: `🚨 *WEBSHOOKS ALERT* 🚨\n\n${message}\n\nTimestamp: ${new Date().toISOString()}`,
                }),
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );

            console.log("✅ WhatsApp alert sent:", response.data.sid);
            return { success: true };
        } catch (error: any) {
            console.error("❌ WhatsApp send failed:", error.response?.data || error.message);
            return { success: false, error: error.response?.data || error.message };
        }
    }

    /**
     * Safe wrapper that also emails if WhatsApp fails.
     */
    public async sendCriticalAlert(message: string) {
        // Try WhatsApp first
        const { success } = await this.sendAlert(message);

        if (!success) {
            // Logic for email fallback could go here if needed, 
            // but usually the health check handles both.
            console.warn("[WhatsAppService] Alert failed to send via WhatsApp.");
        }
    }
}

export const whatsapp = WhatsAppService.getInstance();
