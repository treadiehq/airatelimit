import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  Headers,
  RawBodyRequest,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { RequireFeature, FeatureGuard } from '../common/guards/feature.guard';
import { PlanService } from '../common/services/plan.service';
import { UsageLimitService } from '../common/services/usage-limit.service';

/**
 * Billing Controller
 * 
 * REST API for billing operations. Only available in cloud mode.
 * All endpoints are protected by the FeatureGuard.
 */
@Controller('billing')
@UseGuards(FeatureGuard)
@RequireFeature('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private billingService: BillingService,
    private stripeService: StripeService,
    private configService: ConfigService,
    private planService: PlanService,
    private usageLimitService: UsageLimitService,
  ) {}

  /**
   * Get current subscription status
   */
  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  async getSubscription(@Req() req: Request) {
    const user = req.user as any;
    return this.billingService.getSubscription(user.userId);
  }

  /**
   * Create a checkout session for upgrading
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(
    @Req() req: Request,
    @Body() body: { plan: 'pro' | 'enterprise' },
  ) {
    const user = req.user as any;
    return this.billingService.createCheckoutSession(user.userId, body.plan);
  }

  /**
   * Create a customer portal session
   */
  @Post('portal')
  @UseGuards(JwtAuthGuard)
  async createPortal(@Req() req: Request) {
    const user = req.user as any;
    return this.billingService.createPortalSession(user.userId);
  }

  /**
   * Cancel subscription
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Req() req: Request) {
    const user = req.user as any;
    await this.billingService.cancelSubscription(user.userId);
    return { success: true };
  }

  /**
   * Get invoices
   */
  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  async getInvoices(@Req() req: Request) {
    const user = req.user as any;
    return this.billingService.getInvoices(user.userId);
  }

  /**
   * Get usage stats for billing (organization-level)
   */
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@Req() req: Request) {
    const user = req.user as any;
    
    // Get organization usage from UsageLimitService
    const usageStats = await this.usageLimitService.getUsageStats(user.organizationId);
    
    return {
      requests: usageStats.requests,
      tokens: usageStats.tokens.current,
      periodStart: usageStats.periodStart,
      periodEnd: usageStats.periodEnd,
    };
  }

  /**
   * Get trial information
   */
  @Get('trial')
  @UseGuards(JwtAuthGuard)
  async getTrialInfo(@Req() req: Request) {
    const user = req.user as any;
    return this.billingService.getTrialInfo(user.userId);
  }

  /**
   * Get plan limits and usage for the current organization
   */
  @Get('plan')
  @UseGuards(JwtAuthGuard)
  async getPlanLimits(@Req() req: Request) {
    const user = req.user as any;
    return this.planService.getUsageSummary(user.organizationId);
  }

  /**
   * Stripe webhook handler
   * Note: This endpoint doesn't use JwtAuthGuard - it uses Stripe signature verification
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    try {
      const event = this.stripeService.constructWebhookEvent(
        req.rawBody,
        signature,
        webhookSecret,
      );

      await this.billingService.handleWebhook(event);
      
      return res.json({ received: true });
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`);
      return res.status(400).json({ error: `Webhook error: ${error.message}` });
    }
  }
}

