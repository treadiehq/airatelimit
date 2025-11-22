import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './organization.entity';
import { ReservedOrganizationName } from './reserved-names.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { SeedReservedNamesService } from './seed-reserved-names.service';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, ReservedOrganizationName])],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, SeedReservedNamesService],
  exports: [OrganizationsService, SeedReservedNamesService],
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

