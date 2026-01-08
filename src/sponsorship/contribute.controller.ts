import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KeyPoolService } from './key-pool.service';
import { EmailService } from '../email/email.service';
import { CreateKeyPoolEntryDto } from './dto/create-key-pool-entry.dto';

/**
 * Public Contribution Controller
 * 
 * Handles public contribution via invite links.
 * Does not require authentication (but can use it if provided).
 */
@Controller('contribute')
export class ContributeController {
  constructor(
    private readonly keyPoolService: KeyPoolService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get invite details by token (public)
   * Returns project info if invite is valid
   */
  @Get(':token')
  async getInviteDetails(@Param('token') token: string) {
    const result = await this.keyPoolService.getInviteByToken(token);

    if (!result) {
      throw new NotFoundException('Invalid or expired invite link');
    }

    return {
      project: result.project,
      inviteName: result.invite.name,
    };
  }

  /**
   * Contribute via invite link (public, but tracks user if authenticated)
   */
  @Post(':token')
  async contributeViaInvite(
    @Param('token') token: string,
    @Body() dto: CreateKeyPoolEntryDto,
  ) {
    // Get invite details first for project name
    const inviteDetails = await this.keyPoolService.getInviteByToken(token);
    
    const result = await this.keyPoolService.contributeViaInvite(token, dto, undefined);
    
    // Send management link email if contributor provided email
    if (dto.contributorEmail && result.managementToken && inviteDetails) {
      const dashboardUrl = this.configService.get<string>('dashboardUrl') || 'http://localhost:3001';
      const managementLink = `${dashboardUrl}/contribute/manage/${result.managementToken}`;
      
      // Send email asynchronously (don't block response)
      this.emailService.sendContributionManagementLink(
        dto.contributorEmail,
        inviteDetails.project.name,
        managementLink,
      ).catch(() => {}); // Ignore email errors
    }
    
    return result;
  }

  /**
   * Contribute via invite link (authenticated version)
   * This allows tracking who contributed
   */
  @Post(':token/authenticated')
  @UseGuards(JwtAuthGuard)
  async contributeViaInviteAuthenticated(
    @Param('token') token: string,
    @Body() dto: CreateKeyPoolEntryDto,
    @Request() req: any,
  ) {
    return this.keyPoolService.contributeViaInvite(token, dto, req.user.userId);
  }

  /**
   * Get contribution details by management token (for anonymous contributors)
   */
  @Get('manage/:managementToken')
  async getContributionByManagementToken(
    @Param('managementToken') managementToken: string,
  ) {
    const entry = await this.keyPoolService.getByManagementToken(managementToken);

    if (!entry) {
      throw new NotFoundException('Invalid management link');
    }

    return entry;
  }

  /**
   * Update contribution by management token (pause/resume, update limits)
   */
  @Post('manage/:managementToken')
  async updateContributionByManagementToken(
    @Param('managementToken') managementToken: string,
    @Body() body: { active?: boolean; monthlyTokenLimit?: number },
  ) {
    const entry = await this.keyPoolService.updateByManagementToken(
      managementToken,
      body,
    );

    if (!entry) {
      throw new NotFoundException('Invalid management link');
    }

    return entry;
  }

  /**
   * Delete/revoke contribution by management token
   */
  @Post('manage/:managementToken/revoke')
  async revokeContributionByManagementToken(
    @Param('managementToken') managementToken: string,
  ) {
    const deleted = await this.keyPoolService.deleteByManagementToken(managementToken);

    if (!deleted) {
      throw new NotFoundException('Invalid management link');
    }

    return { success: true, message: 'Contribution revoked successfully' };
  }
}

