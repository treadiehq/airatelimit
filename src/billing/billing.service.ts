import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';

export interface SubscriptionInfo {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Billing Service
 * 
 * High-level billing operations. Manages user subscriptions,
 * checkout sessions, and syncs with Stripe.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private stripeService: StripeService,
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  /**
   * Get subscription for a user's organization
   */
  async getSubscription(userId: string): Promise<SubscriptionInfo | null> {
    // Check for test override first (development only)
    const testPlan = this.configService.get<string>('TEST_PLAN_OVERRIDE');
    if (testPlan) {
      this.logger.debug(`Using TEST_PLAN_OVERRIDE: ${testPlan}`);
      return this.getTestSubscription(testPlan);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user?.organization) {
      return null;
    }

    // If no Stripe subscription but has a paid plan (e.g., admin-granted enterprise)
    // Return a virtual subscription so dashboard shows the correct plan
    if (!user.organization.stripeSubscriptionId) {
      const dbPlan = user.organization.plan;
      if (dbPlan === 'enterprise' || dbPlan === 'pro' || dbPlan === 'basic') {
        return {
          id: 'admin-granted',
          status: 'active',
          plan: dbPlan,
          currentPeriodEnd: undefined,
          cancelAtPeriodEnd: false,
        };
      }
      return null;
    }

    try {
      const subscription = await this.stripeService.getSubscription(
        user.organization.stripeSubscriptionId,
      );

      return {
        id: subscription.id,
        status: subscription.status,
        plan: this.getPlanFromPriceId(subscription.items.data[0]?.price?.id),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate a test subscription for development
   */
  private getTestSubscription(testPlan: string): SubscriptionInfo | null {
    const plan = testPlan.toLowerCase();
    
    // "trial" or "none" means no subscription
    if (plan === 'trial' || plan === 'none') {
      return null;
    }

    // "expired" simulates an expired subscription
    if (plan === 'expired') {
      return {
        id: 'test_sub_expired',
        status: 'canceled',
        plan: 'pro',
        currentPeriodEnd: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        cancelAtPeriodEnd: false,
      };
    }

    // Active plan (basic, pro, enterprise)
    if (['basic', 'pro', 'enterprise'].includes(plan)) {
      return {
        id: `test_sub_${plan}`,
        status: 'active',
        plan: plan,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        cancelAtPeriodEnd: false,
      };
    }

    return null;
  }

  /**
   * Create a checkout session for upgrading
   */
  async createCheckoutSession(
    userId: string,
    plan: 'basic' | 'pro' | 'enterprise',
  ): Promise<{ url: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const priceId = this.getPriceId(plan);
    if (!priceId) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

    const dashboardUrl = this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:3001';
    
    // Get or create Stripe customer
    let customerId = user.organization?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await this.stripeService.getOrCreateCustomer({
        email: user.email,
        metadata: {
          userId: user.id,
          organizationId: user.organization?.id,
        },
      });
      customerId = customer.id;
      
      // Save customer ID to organization
      if (user.organization) {
        await this.organizationRepository.update(user.organization.id, {
          stripeCustomerId: customerId,
        });
      }
    }

    // Only Basic plan gets a 7-day free trial
    const trialDays = plan === 'basic' ? 7 : undefined;

    const session = await this.stripeService.createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${dashboardUrl}/billing?success=true`,
      cancelUrl: `${dashboardUrl}/billing?canceled=true`,
      metadata: {
        userId: user.id,
        organizationId: user.organization?.id,
        plan,
      },
      trialDays,
    });

    return { url: session.url };
  }

  /**
   * Create a customer portal session for managing subscription
   */
  async createPortalSession(userId: string): Promise<{ url: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user?.organization?.stripeCustomerId) {
      throw new BadRequestException('No billing account found');
    }

    const dashboardUrl = this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:3001';

    // Use product-specific portal configuration if set
    const portalConfigId = this.configService.get<string>('STRIPE_PORTAL_CONFIG_ID');

    const session = await this.stripeService.createPortalSession({
      customerId: user.organization.stripeCustomerId,
      returnUrl: `${dashboardUrl}/billing`,
      configurationId: portalConfigId,
    });

    return { url: session.url };
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user?.organization?.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription');
    }

    await this.stripeService.cancelSubscription(user.organization.stripeSubscriptionId);
  }

  /**
   * Get invoices for a user
   */
  async getInvoices(userId: string): Promise<any[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user?.organization?.stripeCustomerId) {
      return [];
    }

    const invoices = await this.stripeService.listInvoices(
      user.organization.stripeCustomerId,
    );

    return invoices.map((invoice) => ({
      id: invoice.id,
      date: new Date(invoice.created * 1000).toISOString(),
      description: invoice.description || `Invoice for ${invoice.lines.data[0]?.description || 'subscription'}`,
      amount: (invoice.amount_paid || 0) / 100,
      status: invoice.status,
      pdfUrl: invoice.invoice_pdf,
    }));
  }

  /**
   * Get trial information for a user
   */
  async getTrialInfo(userId: string): Promise<{ trialEndsAt: string | null; daysRemaining: number }> {
    // Check for test override first (development only)
    const testPlan = this.configService.get<string>('TEST_PLAN_OVERRIDE');
    if (testPlan) {
      return this.getTestTrialInfo(testPlan);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user) {
      return { trialEndsAt: null, daysRemaining: 0 };
    }

    // Check if organization has a paid plan - if so, no trial needed
    if (user.organization?.plan && user.organization.plan !== 'free' && user.organization.plan !== 'trial') {
      return { trialEndsAt: null, daysRemaining: 0 };
    }

    // Use organization's trialStartedAt if available, otherwise use createdAt
    // This allows resetting trials for testing or extending for specific orgs
    const trialStartDate = user.organization?.trialStartedAt 
      || user.createdAt 
      || user.organization?.createdAt 
      || new Date();
    
    const createdAt = new Date(trialStartDate);
    const trialEndsAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const now = new Date();
    const diffTime = trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return {
      trialEndsAt: trialEndsAt.toISOString(),
      daysRemaining,
    };
  }

  /**
   * Generate test trial info for development
   */
  private getTestTrialInfo(testPlan: string): { trialEndsAt: string | null; daysRemaining: number } {
    const plan = testPlan.toLowerCase();
    
    // If they have a paid plan, no trial info needed
    if (['basic', 'pro', 'enterprise'].includes(plan)) {
      return { trialEndsAt: null, daysRemaining: 0 };
    }

    // "expired" or "trial_expired" simulates expired trial
    if (plan === 'expired' || plan === 'trial_expired') {
      return {
        trialEndsAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        daysRemaining: 0,
      };
    }

    // "trial" or "none" - active trial with days remaining
    // Can use "trial_3" for 3 days left, etc.
    const trialMatch = plan.match(/^trial_?(\d+)?$/);
    if (trialMatch || plan === 'none') {
      const days = trialMatch?.[1] ? parseInt(trialMatch[1], 10) : 7;
      return {
        trialEndsAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: days,
      };
    }

    // Default: 7 day trial
    return {
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      daysRemaining: 7,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: any): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
        
      default:
        this.logger.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: any): Promise<void> {
    const { organizationId, plan } = session.metadata || {};
    
    if (!organizationId) {
      this.logger.warn('Checkout completed without organization ID');
      return;
    }

    await this.organizationRepository.update(organizationId, {
      stripeSubscriptionId: session.subscription,
      plan: plan || 'pro',
    });

    this.logger.log(`Subscription activated for organization ${organizationId}`);
  }

  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const organization = await this.organizationRepository.findOne({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!organization) {
      this.logger.warn(`Organization not found for subscription ${subscription.id}`);
      return;
    }

    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      await this.organizationRepository.update(organization.id, {
        plan: 'free',
        stripeSubscriptionId: null,
      });
      this.logger.log(`Subscription canceled for organization ${organization.id}`);
    }
  }

  private async handlePaymentFailed(invoice: any): Promise<void> {
    this.logger.warn(`Payment failed for invoice ${invoice.id}`);
    // Could send notification email here
  }

  private getPriceId(plan: string): string | null {
    const prices: Record<string, string> = {
      basic: this.configService.get<string>('STRIPE_PRICE_ID_BASIC'),
      pro: this.configService.get<string>('STRIPE_PRICE_ID_PRO'),
      enterprise: this.configService.get<string>('STRIPE_PRICE_ID_ENTERPRISE'),
    };
    return prices[plan] || null;
  }

  private getPlanFromPriceId(priceId: string): string {
    const basicPriceId = this.configService.get<string>('STRIPE_PRICE_ID_BASIC');
    const proPriceId = this.configService.get<string>('STRIPE_PRICE_ID_PRO');
    const enterprisePriceId = this.configService.get<string>('STRIPE_PRICE_ID_ENTERPRISE');

    if (priceId === basicPriceId) return 'basic';
    if (priceId === proPriceId) return 'pro';
    if (priceId === enterprisePriceId) return 'enterprise';
    return 'unknown';
  }
}

