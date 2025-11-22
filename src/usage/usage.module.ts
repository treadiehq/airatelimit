import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageCounter } from './usage.entity';
import { RuleTrigger } from './rule-trigger.entity';
import { UsageService } from './usage.service';
import { RuleEngineService } from './rule-engine.service';
import { RuleAnalyticsService } from './rule-analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsageCounter, RuleTrigger])],
  providers: [UsageService, RuleEngineService, RuleAnalyticsService],
  exports: [UsageService, RuleEngineService, RuleAnalyticsService],
})
export class UsageModule {}

