import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageCounter } from './usage.entity';
import { UsageService } from './usage.service';
import { IdentityLimitsModule } from '../identity-limits/identity-limits.module';
import { Organization } from '../organizations/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageCounter, Organization]),
    forwardRef(() => IdentityLimitsModule),
  ],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
