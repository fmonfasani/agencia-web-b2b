import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { StripeService } from '../services/stripe.service.js';
import { toolLogger } from '../middleware/logger.js';

const log = toolLogger('upgrade_subscription');

export function registerUpgradeSubscription(server: McpServer, stripeService: StripeService): void {
  server.tool(
    'upgrade_subscription',
    'Upgrades (or downgrades) a subscription to a new plan. Applies prorations automatically.',
    {
      subscription_id: z.string().describe('Stripe subscription ID to upgrade (e.g. sub_xxx)'),
      new_plan: z.enum(['starter', 'pro', 'enterprise']).describe('Target plan to switch to'),
    },
    async ({ subscription_id, new_plan }) => {
      log.info(`Tool called: subscription_id=${subscription_id}, new_plan=${new_plan}`);
      const result = await stripeService.upgradeSubscription(subscription_id, new_plan);

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
