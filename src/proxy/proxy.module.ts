import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { ProjectsModule } from '../projects/projects.module';
import { UsageModule } from '../usage/usage.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [ProjectsModule, UsageModule, ProvidersModule],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class ProxyModule {}

