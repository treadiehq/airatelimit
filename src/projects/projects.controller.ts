import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectFieldsGuard } from '../common/guards/project-fields.guard';
import { ProjectsService } from './projects.service';
import { CreateUserProjectDto } from './dto/create-user-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { SecurityEvent } from '../security/security-event.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageService } from '../usage/usage.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly usageService: UsageService,
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepository: Repository<SecurityEvent>,
  ) {}

  /**
   * Helper to verify project exists and user has access (same organization).
   * Throws NotFoundException if project doesn't exist.
   * Throws ForbiddenException if user is not in the same organization.
   */
  private async verifyProjectAccess(projectId: string, organizationId: string) {
    const project = await this.projectsService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied');
    }
    return project;
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateUserProjectDto) {
    const userId = req.user.userId;
    const organizationId = req.user.organizationId;
    const project = await this.projectsService.createForUser(
      userId,
      organizationId,
      dto,
    );
    return this.maskApiKey(project);
  }

  @Get()
  async findAll(@Request() req) {
    const organizationId = req.user.organizationId;
    const projects =
      await this.projectsService.findByOrganization(organizationId);
    return projects.map((p) => this.maskApiKey(p));
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const project = await this.verifyProjectAccess(id, req.user.organizationId);
    return this.maskApiKey(project);
  }

  @Put(':id')
  @UseGuards(ProjectFieldsGuard)
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    await this.verifyProjectAccess(id, req.user.organizationId);
    const updated = await this.projectsService.update(id, dto);
    return this.maskApiKey(updated);
  }

  @Patch(':id')
  async updatePartial(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    await this.verifyProjectAccess(id, req.user.organizationId);
    const updated = await this.projectsService.update(id, dto);
    return this.maskApiKey(updated);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    await this.verifyProjectAccess(id, req.user.organizationId);
    await this.projectsService.delete(id);
    return { message: 'Project deleted successfully' };
  }

  // ====================================
  // COST INTELLIGENCE ENDPOINTS
  // ====================================

  /**
   * Get cost summary for a project
   */
  @Get(':id/analytics/costs')
  async getCostSummary(@Request() req, @Param('id') projectId: string) {
    await this.verifyProjectAccess(projectId, req.user.organizationId);
    const summary = await this.usageService.getCostSummaryForProject(projectId);
    const projected = await this.usageService.getProjectedCost(projectId);
    
    return {
      ...summary,
      projected,
    };
  }

  /**
   * Get cost breakdown by model
   */
  @Get(':id/analytics/costs/by-model')
  async getCostsByModel(
    @Request() req,
    @Param('id') projectId: string,
    @Query('days') days?: string,
  ) {
    await this.verifyProjectAccess(projectId, req.user.organizationId);
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.usageService.getCostByModel(projectId, daysNum);
  }

  /**
   * Get top users by cost
   */
  @Get(':id/analytics/costs/top-users')
  async getTopUsersByCost(
    @Request() req,
    @Param('id') projectId: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    await this.verifyProjectAccess(projectId, req.user.organizationId);
    const daysNum = days ? parseInt(days, 10) : 30;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.usageService.getTopUsersByCost(projectId, daysNum, limitNum);
  }

  /**
   * Get cost history over time
   */
  @Get(':id/analytics/costs/history')
  async getCostHistory(
    @Request() req,
    @Param('id') projectId: string,
    @Query('days') days?: string,
  ) {
    await this.verifyProjectAccess(projectId, req.user.organizationId);
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.usageService.getCostHistory(projectId, daysNum);
  }

  /**
   * Update routing configuration
   */
  @Put(':id/routing')
  @UseGuards(ProjectFieldsGuard)
  async updateRouting(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: { routingEnabled?: boolean; routingConfig?: any },
  ) {
    await this.verifyProjectAccess(id, req.user.organizationId);
    const updated = await this.projectsService.update(id, dto);
    return this.maskApiKey(updated);
  }

  /**
   * Update budget configuration
   */
  @Put(':id/budget')
  async updateBudget(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: { budgetConfig?: any },
  ) {
    await this.verifyProjectAccess(id, req.user.organizationId);
    const updated = await this.projectsService.update(id, dto);
    return this.maskApiKey(updated);
  }

  @Get(':id/security/events')
  async getSecurityEvents(
    @Request() req,
    @Param('id') projectId: string,
    @Query('limit') limit?: string,
  ) {
    await this.verifyProjectAccess(projectId, req.user.organizationId);
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const events = await this.securityEventRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: limitNum,
    });

    return events;
  }

  @Post(':id/regenerate-secret')
  async regenerateSecretKey(@Request() req, @Param('id') id: string) {
    await this.verifyProjectAccess(id, req.user.organizationId);
    const newSecretKey = await this.projectsService.regenerateSecretKey(id);
    return { secretKey: newSecretKey };
  }

  /**
   * Mask sensitive API keys in project responses.
   * Only shows first few and last few characters to confirm key is configured.
   */
  private maskApiKey(project: any) {
    const result = { ...project };

    // Mask legacy openaiApiKey
    if (result.openaiApiKey) {
      const key = result.openaiApiKey;
      result.openaiApiKey =
        key.length > 11 ? key.substring(0, 7) + '****' + key.slice(-4) : '****';
    }

    // Mask providerKeys - only show that a key exists, not the actual key
    if (result.providerKeys) {
      const maskedProviderKeys: Record<
        string,
        { apiKey: string; baseUrl?: string; configured: boolean }
      > = {};
      for (const [provider, config] of Object.entries(result.providerKeys)) {
        const providerConfig = config as { apiKey: string; baseUrl?: string };
        if (providerConfig?.apiKey) {
          const key = providerConfig.apiKey;
          maskedProviderKeys[provider] = {
            // Show first 4 and last 4 chars only
            apiKey:
              key.length > 12
                ? key.substring(0, 4) + '••••••••' + key.slice(-4)
                : '••••••••',
            ...(providerConfig.baseUrl && { baseUrl: providerConfig.baseUrl }),
            configured: true,
          };
        }
      }
      result.providerKeys = maskedProviderKeys;
    }

    return result;
  }
}
