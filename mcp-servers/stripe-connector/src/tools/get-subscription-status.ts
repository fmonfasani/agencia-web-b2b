import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { StripeService } from '../services/stripe.service.js';
import { toolLogger } from '../middleware/logger.js';

const log = toolLogger('get_subscription_status');

export function registerGetSubscriptionStatus(server: McpServer, stripeService: StripeService): void {
  server.tool(
    'get_subscription_status',
    'Retrieves the current status, plan, and billing period details for a subscription.',
    {
      subscription_id: z.string().describe('Stripe subscription ID to query (e.g. sub_xxx)'),
    },
    async ({ subscription_id }) => {
      log.info(`Tool called: subscription_id=${subscription_id}`);
      const result = await stripeService.getSubscriptionStatus(subscription_id);

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
