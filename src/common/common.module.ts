import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from './crypto.service';
import { RateLimitService } from './rate-limit.service';
import { ProxyRateLimitMiddleware } from './proxy-rate-limit.middleware';
import { FeatureGuard } from './guards/feature.guard';
import { PlanGuard } from './guards/plan.guard';
import { LicenseGuard } from './guards/license.guard';
import { PlanService } from './services/plan.service';
import { UsageLimitService } from './services/usage-limit.service';
import { Organization } from '../organizations/organization.entity';
import { Project } from '../projects/projects.entity';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Organization, Project]),
  ],
  providers: [
    CryptoService,
    RateLimitService,
    ProxyRateLimitMiddleware,
    FeatureGuard,
    PlanGuard,
    LicenseGuard,
    PlanService,
    UsageLimitService,
  ],
  exports: [
    CryptoService,
    RateLimitService,
    ProxyRateLimitMiddleware,
    FeatureGuard,
    PlanGuard,
    LicenseGuard,
    PlanService,
    UsageLimitService,
  ],
})
export class CommonModule {}
