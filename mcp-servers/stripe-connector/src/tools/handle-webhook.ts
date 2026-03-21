import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { StripeService } from '../services/stripe.service.js';
import { toolLogger } from '../middleware/logger.js';

const log = toolLogger('handle_webhook');

export function registerHandleWebhook(server: McpServer, stripeService: StripeService): void {
  server.tool(
    'handle_webhook',
    'Processes incoming Stripe webhook events (invoice.paid, invoice.payment_failed, customer.subscription.deleted). Verifies signature if provided.',
    {
      event_type: z
        .enum([
          'invoice.paid',
          'invoice.payment_failed',
          'customer.subscription.deleted',
        ])
        .describe('Type of the Stripe webhook event'),
      payload: z
        .record(z.unknown())
        .describe('The full event payload object from Stripe'),
      signature: z
        .string()
        .optional()
        .describe('Stripe-Signature header for event verification'),
    },
    async ({ event_type, payload, signature }) => {
      log.info(`Tool called: event_type=${event_type}`);
      const result = await stripeService.handleWebhookEvent(
        event_type,
        payload as Record<string, unknown>,
        signature
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
