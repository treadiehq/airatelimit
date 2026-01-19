import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './projects.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { UserUsageController } from '../usage/user-usage.controller';
import { UsageModule } from '../usage/usage.module';
import { SecurityEvent } from '../security/security-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, SecurityEvent]), UsageModule],
  providers: [ProjectsService],
  controllers: [ProjectsController, UserUsageController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
