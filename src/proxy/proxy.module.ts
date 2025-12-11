import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TransparentProxyController } from './transparent-proxy.controller';
import { TransparentProxyService } from './transparent-proxy.service';
import { ProjectsModule } from '../projects/projects.module';
import { UsageModule } from '../usage/usage.module';
import { SecurityModule } from '../security/security.module';
import { PricingModule } from '../pricing/pricing.module';
import { AnonymizationModule } from '../anonymization/anonymization.module';
import { FlowModule } from '../flow/flow.module';
import { PromptsModule } from '../prompts/prompts.module';
import { SecurityEvent } from '../security/security-event.entity';
import { AnonymizationLog } from '../anonymization/anonymization-log.entity';

@Module({
  imports: [
    ProjectsModule,
    UsageModule,
    SecurityModule,
    PricingModule,
    AnonymizationModule,
    FlowModule,
    PromptsModule,
    TypeOrmModule.forFeature([SecurityEvent, AnonymizationLog]),
    HttpModule,
  ],
  controllers: [TransparentProxyController],
  providers: [TransparentProxyService],
})
export class ProxyModule {}
