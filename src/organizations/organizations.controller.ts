import { Controller, Get, Post, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
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
      // API key is never stored in plaintext for security
      // Only indicate whether one is configured
      hasApiKey: this.organizationsService.hasApiKey(organization),
    };
  }

  /**
   * Generate a new organization API key
   * POST /api/organizations/me/api-key
   * 
   * Returns the plaintext key - SAVE IT! It's only shown once.
   */
  @Post('me/api-key')
  @HttpCode(HttpStatus.OK)
  async generateApiKey(@Request() req) {
    const apiKey = await this.organizationsService.generateApiKey(
      req.user.organizationId,
    );

    return {
      apiKey,
      warning: 'Save this API key! It will only be shown once.',
      usage: 'Use in Authorization header: Bearer org_sk_xxx',
    };
  }

  /**
   * Revoke the organization API key
   * POST /api/organizations/me/api-key/revoke
   */
  @Post('me/api-key/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeApiKey(@Request() req) {
    await this.organizationsService.revokeApiKey(req.user.organizationId);

    return {
      message: 'API key revoked. Any services using it will stop working.',
    };
  }
}
