#!/usr/bin/env node
/**
 * stripe-connector MCP Server
 *
 * A Model Context Protocol server that abstracts Stripe as a SaaS
 * monetization layer. Exposes subscription management and webhook
 * handling tools for AI agents.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StripeService } from './services/stripe.service.js';
import { logger } from './middleware/logger.js';

// Import tool registrations
import { registerCreateSubscription } from './tools/create-subscription.js';
import { registerCancelSubscription } from './tools/cancel-subscription.js';
import { registerUpgradeSubscription } from './tools/upgrade-subscription.js';
import { registerGetSubscriptionStatus } from './tools/get-subscription-status.js';
import { registerHandleWebhook } from './tools/handle-webhook.js';

async function main() {
  // Mark stdio mode so logger doesn't pollute the MCP transport
  process.env.MCP_STDIO_MODE = 'true';

  logger.info('Starting stripe-connector MCP server...');

  // Initialize the Stripe service
  const stripeService = new StripeService();

  // Create the MCP server
  const server = new McpServer(
    {
      name: 'stripe-connector',
      version: '1.0.0',
    },
    {
      capabilities: {
        logging: {},
      },
    }
  );

  // Register all tools
  registerCreateSubscription(server, stripeService);
  registerCancelSubscription(server, stripeService);
  registerUpgradeSubscription(server, stripeService);
  registerGetSubscriptionStatus(server, stripeService);
  registerHandleWebhook(server, stripeService);

  logger.info('All tools registered: create_subscription, cancel_subscription, upgrade_subscription, get_subscription_status, handle_webhook');

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('stripe-connector MCP server connected and ready');
}

main().catch((error) => {
  logger.error('Fatal error starting server', { error });
  process.exit(1);
});
