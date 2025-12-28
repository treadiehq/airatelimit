import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';

/**
 * Billing Module
 * 
 * Provides Stripe integration for cloud mode:
 * - Subscription management
 * - Checkout sessions
 * - Customer portal
 * - Webhook handling
 * - Invoice management
 * 
 * Note: The FeatureGuard on the controller handles access control
 * based on deployment mode. The module is always registered to avoid
 * initialization timing issues with environment variables.
 */
@Module({})
export class BillingModule {
  /**
   * Register the billing module
   * Access control is handled by FeatureGuard at runtime
   */
  static register(): DynamicModule {
    return {
      module: BillingModule,
      imports: [
        ConfigModule,
        TypeOrmModule.forFeature([User, Organization]),
      ],
      controllers: [BillingController],
      providers: [BillingService, StripeService],
      exports: [BillingService],
    };
  }
}

