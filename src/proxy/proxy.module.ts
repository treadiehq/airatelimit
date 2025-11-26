import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { TransparentProxyController } from './transparent-proxy.controller';
import { TransparentProxyService } from './transparent-proxy.service';
import { ProjectsModule } from '../projects/projects.module';
import { UsageModule } from '../usage/usage.module';
import { ProvidersModule } from '../providers/providers.module';
import { SecurityModule } from '../security/security.module';
import { SecurityEvent } from '../security/security-event.entity';

@Module({
  imports: [
    ProjectsModule,
    UsageModule,
    ProvidersModule,
    SecurityModule,
    TypeOrmModule.forFeature([SecurityEvent]),
    HttpModule,
  ],
  controllers: [ProxyController, TransparentProxyController],
  providers: [ProxyService, TransparentProxyService],
})
export class ProxyModule {}

