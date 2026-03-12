import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserKey } from './user-key.entity';
import { ByokConfig } from './byok-config.entity';
import { ByokService } from './byok.service';
import { ByokController, ByokApiController } from './byok.controller';
import { Organization } from '../organizations/organization.entity';
import { CommonModule } from '../common/common.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserKey, ByokConfig, Organization]),
    CommonModule,
    OrganizationsModule,
    UsersModule,
  ],
  controllers: [ByokController, ByokApiController],
  providers: [ByokService],
  exports: [ByokService],
})
export class ByokModule {}
