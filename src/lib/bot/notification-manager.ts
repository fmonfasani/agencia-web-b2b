import { LeadInfo } from "./lead-manager";

/**
 * Handles real-time notifications for qualified leads.
 * In a production environment, this would integrate with Slack, Discord, or Email.
 */
export async function notifyQualifiedLead(lead: LeadInfo) {
  const message = `
    🚨 *Nuevo Lead Calificado* 🚨
    
    *Nombre:* ${lead.name || "No proporcionado"}
    *Empresa:* ${lead.company || "No proporcionado"}
    *Necesidad:* ${lead.need || "No proporcionado"}
    *Presupuesto:* ${lead.budget || "No proporcionado"}
    *Teléfono:* wa.me/${lead.phone}
    
    _Este lead ha sido calificado automáticamente por el IA Bot._
  `;

  try {
    // Log for now (Simulating console alert)
    console.log("--- NOTIFICATION SENT ---");
    console.log(message);
    console.log("-------------------------");

    // Future integration example (Slack Webhook):
    /*
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });
    }
    */

    return true;
  } catch (error) {
    console.error("[Notification Manager] Error sending notification:", error);
    return false;
  }
}
