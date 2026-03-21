import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { StripeService } from '../services/stripe.service.js';
import { toolLogger } from '../middleware/logger.js';

const log = toolLogger('create_subscription');

export function registerCreateSubscription(server: McpServer, stripeService: StripeService): void {
  server.tool(
    'create_subscription',
    'Creates a new Stripe subscription for a customer. Returns subscription_id and status.',
    {
      customer_id: z.string().describe('Stripe customer ID (e.g. cus_xxx)'),
      plan: z.enum(['starter', 'pro', 'enterprise']).describe('Subscription plan to create'),
    },
    async ({ customer_id, plan }) => {
      log.info(`Tool called: customer_id=${customer_id}, plan=${plan}`);
      const result = await stripeService.createSubscription(customer_id, plan);

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
