import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Organization } from './organization.entity';
import { ReservedOrganizationName } from './reserved-names.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { SeedReservedNamesService } from './seed-reserved-names.service';
import { OrgApiKeyGuard } from '../common/guards/org-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, ReservedOrganizationName]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, SeedReservedNamesService, OrgApiKeyGuard],
  exports: [OrganizationsService, SeedReservedNamesService, OrgApiKeyGuard, JwtModule],
})
export class OrganizationsModule implements OnModuleInit {
  constructor(
    private readonly seedReservedNamesService: SeedReservedNamesService,
  ) {}

  async onModuleInit() {
    // Auto-sync reserved names on startup
    await this.seedReservedNamesService.seed();
  }
}
