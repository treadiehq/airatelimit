import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IdentityLimit } from './identity-limit.entity';
import { IdentityLimitsService } from './identity-limits.service';
import { IdentityLimitsController } from './identity-limits.controller';
import { ProjectsModule } from '../projects/projects.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsageModule } from '../usage/usage.module';
import { ProjectAuthGuard } from '../common/guards/project-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([IdentityLimit]),
    forwardRef(() => ProjectsModule),
    OrganizationsModule,
    forwardRef(() => UsageModule),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('jwtSecret') ||
          configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [IdentityLimitsController],
  providers: [IdentityLimitsService, ProjectAuthGuard],
  exports: [IdentityLimitsService],
})
export class IdentityLimitsModule {}
