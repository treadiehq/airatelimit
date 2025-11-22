import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { UsageModule } from './usage/usage.module';
import { ProxyModule } from './proxy/proxy.module';
import { ProvidersModule } from './providers/providers.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    UsageModule,
    ProxyModule,
    ProvidersModule,
  ],
})
export class AppModule {}

