import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sponsorship } from './sponsorship.entity';
import { KeyPoolEntry } from './key-pool.entity';
import { KeyPoolInvite } from './key-pool-invite.entity';
import { SponsorshipService } from './sponsorship.service';
import { KeyPoolService } from './key-pool.service';
import { SponsorshipController } from './sponsorship.controller';
import { ContributeController } from './contribute.controller';
import { Project } from '../projects/projects.entity';
import { CommonModule } from '../common/common.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sponsorship, KeyPoolEntry, KeyPoolInvite, Project]),
    CommonModule,
    EmailModule,
  ],
  controllers: [SponsorshipController, ContributeController],
  providers: [SponsorshipService, KeyPoolService],
  exports: [SponsorshipService, KeyPoolService],
})
export class SponsorshipModule {}

