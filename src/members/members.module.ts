import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { OrganizationMember } from './organization-member.entity';
import { OrganizationInvite } from './organization-invite.entity';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Project } from '../projects/projects.entity';
import { EmailModule } from '../email/email.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationMember,
      OrganizationInvite,
      User,
      Organization,
      Project,
    ]),
    EmailModule,
    CommonModule,
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}

