import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageCounter } from './usage.entity';
import { UsageService } from './usage.service';
import { RuleEngineService } from './rule-engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsageCounter])],
  providers: [UsageService, RuleEngineService],
  exports: [UsageService, RuleEngineService],
})
export class UsageModule {}

