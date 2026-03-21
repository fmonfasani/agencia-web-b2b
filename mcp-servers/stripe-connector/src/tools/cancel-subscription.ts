import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { StripeService } from '../services/stripe.service.js';
import { toolLogger } from '../middleware/logger.js';

const log = toolLogger('cancel_subscription');

export function registerCancelSubscription(server: McpServer, stripeService: StripeService): void {
  server.tool(
    'cancel_subscription',
    'Cancels an existing Stripe subscription. The subscription will be terminated immediately.',
    {
      subscription_id: z.string().describe('Stripe subscription ID to cancel (e.g. sub_xxx)'),
    },
    async ({ subscription_id }) => {
      log.info(`Tool called: subscription_id=${subscription_id}`);
      const result = await stripeService.cancelSubscription(subscription_id);

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
