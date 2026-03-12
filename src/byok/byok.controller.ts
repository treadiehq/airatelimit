import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ByokService } from './byok.service';
import { StoreKeyDto } from './dto/store-key.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgApiKeyGuard } from '../common/guards/org-api-key.guard';

/**
 * BYOK Controller
 * 
 * Dashboard endpoints for managing BYOK (Bring Your Own Key).
 * Requires JWT authentication.
 */
@Controller('byok')
@UseGuards(JwtAuthGuard)
export class ByokController {
  constructor(private byokService: ByokService) {}

  /**
   * Get BYOK config for the organization
   */
  @Get('config')
  async getConfig(@Request() req) {
    const organizationId = req.user.organizationId;
    return this.byokService.getOrCreateConfig(organizationId);
  }

  /**
   * Update BYOK config
   */
  @Patch('config')
  async updateConfig(@Request() req, @Body() dto: UpdateConfigDto) {
    const organizationId = req.user.organizationId;
    return this.byokService.updateConfig(organizationId, dto);
  }

  /**
   * List all user keys (admin view)
   */
  @Get('keys')
  async listKeys(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const organizationId = req.user.organizationId;
    return this.byokService.listAllKeys(organizationId, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      search,
    });
  }

  /**
   * Revoke a user key
   */
  @Patch('keys/:id/revoke')
  async revokeKey(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return this.byokService.revokeKey(organizationId, id);
  }

  /**
   * Delete a user key
   */
  @Delete('keys/:id')
  async deleteKey(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    await this.byokService.deleteKey(organizationId, id);
    return { success: true };
  }

  /**
   * Get BYOK stats
   */
  @Get('stats')
  async getStats(@Request() req) {
    const organizationId = req.user.organizationId;
    return this.byokService.getStats(organizationId);
  }

  /**
   * Check if BYOK is available for the organization
   */
  @Get('available')
  async checkAvailability(@Request() req) {
    const organizationId = req.user.organizationId;
    const available = await this.byokService.isByokAvailable(organizationId);
    return { available };
  }
}

/**
 * BYOK API Controller
 * 
 * Programmatic API endpoints for storing/managing user keys.
 * Requires org_sk_xxx authentication.
 */
@Controller('v1/byok')
@UseGuards(OrgApiKeyGuard)
export class ByokApiController {
  constructor(private byokService: ByokService) {}

  /**
   * Store a user's API key
   */
  @Post('keys')
  async storeKey(@Request() req, @Body() dto: StoreKeyDto) {
    const organizationId = req.organization.id;
    const key = await this.byokService.storeKey(
      organizationId,
      dto.identity,
      dto.provider,
      dto.apiKey,
      dto.baseUrl,
    );

    return {
      id: key.id,
      identity: key.identity,
      provider: key.provider,
      keyHint: key.keyHint,
      createdAt: key.createdAt,
    };
  }

  /**
   * List keys for an identity
   */
  @Get('keys')
  async listKeys(@Request() req, @Query('identity') identity: string) {
    const organizationId = req.organization.id;
    
    if (identity) {
      return this.byokService.listKeysForIdentity(organizationId, identity);
    }

    return this.byokService.listAllKeys(organizationId, { limit: 100 });
  }

  /**
   * Delete a user's key
   */
  @Delete('keys/:id')
  async deleteKey(@Request() req, @Param('id') id: string) {
    const organizationId = req.organization.id;
    await this.byokService.deleteKey(organizationId, id);
    return { success: true };
  }

  /**
   * Revoke a key
   */
  @Patch('keys/:id/revoke')
  async revokeKey(@Request() req, @Param('id') id: string) {
    const organizationId = req.organization.id;
    return this.byokService.revokeKey(organizationId, id);
  }

  /**
   * Get config
   */
  @Get('config')
  async getConfig(@Request() req) {
    const organizationId = req.organization.id;
    return this.byokService.getOrCreateConfig(organizationId);
  }

  /**
   * Update config
   */
  @Patch('config')
  async updateConfig(@Request() req, @Body() dto: UpdateConfigDto) {
    const organizationId = req.organization.id;
    return this.byokService.updateConfig(organizationId, dto);
  }
}
