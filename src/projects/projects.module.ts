import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './projects.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { UserProjectsController } from './user-projects.controller';
import { UserUsageController } from '../usage/user-usage.controller';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), UsageModule],
  providers: [ProjectsService],
  controllers: [ProjectsController, UserProjectsController, UserUsageController],
  exports: [ProjectsService],
})
export class ProjectsModule {}

