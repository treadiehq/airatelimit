import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Stripe Service
 * 
 * Low-level Stripe API wrapper. Only instantiated in cloud mode.
 */
@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured - billing features will not work');
      return;
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });

    this.logger.log('Stripe initialized');
  }

  get client(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe not initialized - check STRIPE_SECRET_KEY');
    }
    return this.stripe;
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    trialDays?: number;
  }): Promise<Stripe.Checkout.Session> {
    return this.client.checkout.sessions.create({
      mode: 'subscription',
      customer: params.customerId,
      customer_email: params.customerId ? undefined : params.customerEmail,
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      subscription_data: {
        metadata: params.metadata,
        ...(params.trialDays ? { trial_period_days: params.trialDays } : {}),
      },
    });
  }

  /**
   * Create a customer portal session
   * @param configurationId - Optional portal configuration ID for custom branding
   */
  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
    configurationId?: string;
  }): Promise<Stripe.BillingPortal.Session> {
    return this.client.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
      ...(params.configurationId ? { configuration: params.configurationId } : {}),
    });
  }

  /**
   * Create a portal configuration for custom branding
   * Run this once per product to get a configuration ID, then store it in env vars
   */
  async createPortalConfiguration(params: {
    businessName: string;
    headline?: string;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
  }): Promise<Stripe.BillingPortal.Configuration> {
    return this.client.billingPortal.configurations.create({
      business_profile: {
        headline: params.headline || `Manage your ${params.businessName} subscription`,
        privacy_policy_url: params.privacyPolicyUrl,
        terms_of_service_url: params.termsOfServiceUrl,
      },
      features: {
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
        subscription_cancel: { 
          enabled: true, 
          mode: 'at_period_end',
          proration_behavior: 'none',
        },
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'name'],
        },
      },
    });
  }

  /**
   * List all portal configurations
   */
  async listPortalConfigurations(): Promise<Stripe.BillingPortal.Configuration[]> {
    const response = await this.client.billingPortal.configurations.list({ limit: 10 });
    return response.data;
  }

  /**
   * Update an existing portal configuration
   */
  async updatePortalConfiguration(
    configurationId: string,
    params: {
      businessName?: string;
      headline?: string;
      privacyPolicyUrl?: string;
      termsOfServiceUrl?: string;
    },
  ): Promise<Stripe.BillingPortal.Configuration> {
    return this.client.billingPortal.configurations.update(configurationId, {
      business_profile: {
        headline: params.headline,
        privacy_policy_url: params.privacyPolicyUrl,
        terms_of_service_url: params.termsOfServiceUrl,
      },
    });
  }

  /**
   * Get or create a Stripe customer
   */
  async getOrCreateCustomer(params: {
    email: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    // First try to find existing customer
    const existing = await this.client.customers.list({
      email: params.email,
      limit: 1,
    });

    if (existing.data.length > 0) {
      return existing.data[0];
    }

    // Create new customer
    return this.client.customers.create({
      email: params.email,
      metadata: params.metadata,
    });
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.client.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Cancel a subscription at period end
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.client.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  /**
   * Resume a cancelled subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.client.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * List invoices for a customer
   */
  async listInvoices(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
    const response = await this.client.invoices.list({
      customer: customerId,
      limit,
    });
    return response.data;
  }

  /**
   * Construct and verify a webhook event
   */
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    return this.client.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}

