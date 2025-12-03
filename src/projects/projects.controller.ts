import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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

  @Post()
  async create(@Request() req, @Body() dto: CreateUserProjectDto) {
    const userId = req.user.userId;
    const organizationId = req.user.organizationId;
    return this.projectsService.createForUser(userId, organizationId, dto);
  }

  @Get()
  async findAll(@Request() req) {
    const userId = req.user.userId;
    return this.projectsService.findByOwner(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
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
  async getCostSummary(@Param('id') projectId: string) {
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
    @Param('id') projectId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.usageService.getCostByModel(projectId, daysNum);
  }

  /**
   * Get top users by cost
   */
  @Get(':id/analytics/costs/top-users')
  async getTopUsersByCost(
    @Param('id') projectId: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.usageService.getTopUsersByCost(projectId, daysNum, limitNum);
  }

  /**
   * Get cost history over time
   */
  @Get(':id/analytics/costs/history')
  async getCostHistory(
    @Param('id') projectId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.usageService.getCostHistory(projectId, daysNum);
  }

  /**
   * Update routing configuration
   */
  @Put(':id/routing')
  async updateRouting(
    @Param('id') id: string,
    @Body() dto: { routingEnabled?: boolean; routingConfig?: any },
  ) {
    return this.projectsService.update(id, dto);
  }

  /**
   * Update budget configuration
   */
  @Put(':id/budget')
  async updateBudget(
    @Param('id') id: string,
    @Body() dto: { budgetConfig?: any },
  ) {
    return this.projectsService.update(id, dto);
  }

  @Get(':id/security/events')
  async getSecurityEvents(
    @Param('id') projectId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const events = await this.securityEventRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: limitNum,
    });

    return events;
  }
}
