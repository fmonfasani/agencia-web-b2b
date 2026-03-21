import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Stripe before importing the service
vi.mock('stripe', () => {
  const mockSubscription = {
    id: 'sub_test_123',
    status: 'active',
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    cancel_at_period_end: false,
    items: {
      data: [
        {
          id: 'si_test_item',
          price: { id: 'price_starter_placeholder' },
        },
      ],
    },
  };

  const mockStripeInstance = {
    subscriptions: {
      create: vi.fn().mockResolvedValue(mockSubscription),
      cancel: vi.fn().mockResolvedValue({ ...mockSubscription, status: 'canceled' }),
      update: vi.fn().mockResolvedValue({ ...mockSubscription, status: 'active' }),
      retrieve: vi.fn().mockResolvedValue(mockSubscription),
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({ type: 'invoice.paid' }),
    },
  };

  return {
    default: vi.fn(() => mockStripeInstance),
    __mockInstance: mockStripeInstance,
  };
});

// Mock logger to avoid file writes during tests
vi.mock('../src/middleware/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
  toolLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Set env before importing service
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';

import { StripeService } from '../src/services/stripe.service.js';

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StripeService();
  });

  // ─── createSubscription ──────────────────────────────────────────

  describe('createSubscription', () => {
    it('should return error when price IDs are not configured (placeholder)', async () => {
      const result = await service.createSubscription('cus_test_123', 'starter');

      // With placeholder price IDs, the service should return an error
      expect(result.status).toBe('error');
      expect(result.error).toContain('Price ID not configured');
      expect(result.data).toBeNull();
    });

    it('should conform to standard response format', async () => {
      const result = await service.createSubscription('cus_test_123', 'starter');

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      expect(['success', 'error']).toContain(result.status);
    });

    it('should return success when proper price IDs are configured', async () => {
      // Set real-looking (non-placeholder) price IDs
      process.env.STRIPE_PRICE_STARTER = 'price_1abc';
      process.env.STRIPE_PRICE_PRO = 'price_2def';
      process.env.STRIPE_PRICE_ENTERPRISE = 'price_3ghi';

      // Re-create the service to pick up new env vars
      const configuredService = new StripeService();
      const result = await configuredService.createSubscription('cus_test_123', 'starter');

      expect(result.status).toBe('success');
      expect(result.data).not.toBeNull();
      expect(result.data!.subscription_id).toBe('sub_test_123');
      expect(result.data!.status).toBe('active');
      expect(result.error).toBeNull();

      // Clean up
      delete process.env.STRIPE_PRICE_STARTER;
      delete process.env.STRIPE_PRICE_PRO;
      delete process.env.STRIPE_PRICE_ENTERPRISE;
    });
  });

  // ─── cancelSubscription ──────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('should return success with canceled status', async () => {
      const result = await service.cancelSubscription('sub_test_123');

      expect(result.status).toBe('success');
      expect(result.data).not.toBeNull();
      expect(result.data!.subscription_id).toBe('sub_test_123');
      expect(result.data!.status).toBe('canceled');
      expect(result.error).toBeNull();
    });

    it('should include canceled_at timestamp', async () => {
      const result = await service.cancelSubscription('sub_test_123');

      expect(result.data!.canceled_at).toBeDefined();
      // Verify it's a valid ISO date
      expect(new Date(result.data!.canceled_at).toISOString()).toBe(result.data!.canceled_at);
    });
  });

  // ─── getSubscriptionStatus ───────────────────────────────────────

  describe('getSubscriptionStatus', () => {
    it('should return subscription details', async () => {
      const result = await service.getSubscriptionStatus('sub_test_123');

      expect(result.status).toBe('success');
      expect(result.data).not.toBeNull();
      expect(result.data!.subscription_id).toBe('sub_test_123');
      expect(result.data!.status).toBeDefined();
      expect(result.data!.current_period_end).toBeDefined();
      expect(typeof result.data!.cancel_at_period_end).toBe('boolean');
    });
  });

  // ─── handleWebhookEvent ──────────────────────────────────────────

  describe('handleWebhookEvent', () => {
    it('should process invoice.paid event', async () => {
      const result = await service.handleWebhookEvent(
        'invoice.paid',
        { id: 'in_test_123', customer: 'cus_test_123' }
      );

      expect(result.status).toBe('success');
      expect(result.data!.processed).toBe(true);
      expect(result.data!.event_type).toBe('invoice.paid');
    });

    it('should process invoice.payment_failed event', async () => {
      const result = await service.handleWebhookEvent(
        'invoice.payment_failed',
        { id: 'in_test_456', customer: 'cus_test_123' }
      );

      expect(result.status).toBe('success');
      expect(result.data!.processed).toBe(true);
    });

    it('should process customer.subscription.deleted event', async () => {
      const result = await service.handleWebhookEvent(
        'customer.subscription.deleted',
        { id: 'sub_test_123', customer: 'cus_test_123' }
      );

      expect(result.status).toBe('success');
      expect(result.data!.processed).toBe(true);
    });

    it('should include a timestamp in the response', async () => {
      const result = await service.handleWebhookEvent(
        'invoice.paid',
        { id: 'in_test_123' }
      );

      expect(result.data!.timestamp).toBeDefined();
      expect(new Date(result.data!.timestamp).toISOString()).toBe(result.data!.timestamp);
    });
  });

  // ─── Standard Response Format ────────────────────────────────────

  describe('Standard Response Format', () => {
    it('all responses should have status, data, and error fields', async () => {
      const responses = [
        await service.cancelSubscription('sub_test_123'),
        await service.getSubscriptionStatus('sub_test_123'),
        await service.handleWebhookEvent('invoice.paid', { id: 'test' }),
      ];

      for (const response of responses) {
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('data');
        expect(response).toHaveProperty('error');
      }
    });
  });
});
