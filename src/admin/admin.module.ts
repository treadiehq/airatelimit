import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import { Project } from '../projects/projects.entity';
import { Sponsorship } from '../sponsorship/sponsorship.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, User, Project, Sponsorship]),
    ConfigModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

