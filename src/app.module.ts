import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { UsageModule } from './usage/usage.module';
import { ProxyModule } from './proxy/proxy.module';
import { IdentityLimitsModule } from './identity-limits/identity-limits.module';
import { HealthModule } from './health/health.module';
import { PromptsModule } from './prompts/prompts.module';
import { BillingModule } from './billing/billing.module';
import { MembersModule } from './members/members.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CommonModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    UsageModule,
    ProxyModule,
    IdentityLimitsModule,
    HealthModule,
    PromptsModule,
    MembersModule,
    AdminModule,
    // Conditionally loaded based on DEPLOYMENT_MODE
    BillingModule.register(),
  ],
})
export class AppModule {}
