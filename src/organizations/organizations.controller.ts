import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  async getMyOrganization(@Request() req) {
    const organization = await this.organizationsService.findById(
      req.user.organizationId,
    );
    
    if (!organization) {
      return { id: null, name: 'Unknown Organization' };
    }

    return {
      id: organization.id,
      name: organization.name,
      description: organization.description,
      createdAt: organization.createdAt,
    };
  }
}

