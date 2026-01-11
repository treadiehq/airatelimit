import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { SponsorKey } from './sponsor-key.entity';
import { Sponsorship } from './sponsorship.entity';
import { SponsoredToken } from './sponsored-token.entity';
import { SponsorshipUsage } from './sponsorship-usage.entity';
import { SponsorshipPool } from './sponsorship-pool.entity';
import { SponsorshipPoolMember } from './sponsorship-pool-member.entity';
import { PoolToken } from './pool-token.entity';

import { SponsorshipService } from './sponsorship.service';
import { SponsorshipController } from './sponsorship.controller';
import { SponsoredController } from './sponsored.controller';
import { PoolService } from './pool.service';
import { PoolController } from './pool.controller';
import { PublicSponsorshipController } from './public-sponsorship.controller';
import { ClaimController } from './claim.controller';

import { CommonModule } from '../common/common.module';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';

/**
 * Sponsorship Module
 * 
 * Provides the Sponsored Usage feature:
 * - Sponsors can register API keys and create sponsorships
 * - Recipients can use sponsored tokens to access AI APIs
 * - All usage is tracked and limited according to sponsorship rules
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SponsorKey,
      Sponsorship,
      SponsoredToken,
      SponsorshipUsage,
      SponsorshipPool,
      SponsorshipPoolMember,
      PoolToken,
      User,
    ]),
    HttpModule,
    CommonModule,
    UsersModule,
    EmailModule,
  ],
  controllers: [SponsorshipController, SponsoredController, PoolController, PublicSponsorshipController, ClaimController],
  providers: [SponsorshipService, PoolService],
  exports: [SponsorshipService, PoolService],
})
export class SponsorshipModule {}

