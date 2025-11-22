import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { RuleAnalyticsService } from '../usage/rule-analytics.service';
import { CreateUserProjectDto } from './dto/create-user-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class UserProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly ruleAnalyticsService: RuleAnalyticsService,
  ) {}

  @Get()
  async listProjects(@Request() req) {
    const projects = await this.projectsService.findByOwner(req.user.userId);
    // Mask API keys in list view
    return projects.map((p) => this.maskApiKey(p));
  }

  @Post()
  async createProject(@Request() req, @Body() dto: CreateUserProjectDto) {
    const project = await this.projectsService.createForUser(
      req.user.userId,
      req.user.organizationId,
      dto,
    );
    return this.maskApiKey(project);
  }

  @Get(':id')
  async getProject(@Request() req, @Param('id') id: string) {
    const project = await this.projectsService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== req.user.userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.maskApiKey(project);
  }

  @Patch(':id')
  async updateProject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== req.user.userId) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.projectsService.update(id, dto);
    return this.maskApiKey(updated);
  }

  @Delete(':id')
  async deleteProject(@Request() req, @Param('id') id: string) {
    const project = await this.projectsService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== req.user.userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.projectsService.delete(id);
    return { message: 'Project deleted' };
  }

  @Get(':id/analytics/rule-triggers')
  async getRuleAnalytics(
    @Request() req,
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    const project = await this.projectsService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== req.user.userId) {
      throw new ForbiddenException('Access denied');
    }

    const daysNum = days ? parseInt(days, 10) : 7;
    const stats = await this.ruleAnalyticsService.getRuleStats(id, daysNum);
    const byDay = await this.ruleAnalyticsService.getTriggersByDay(id, daysNum);

    return {
      stats,
      byDay,
    };
  }

  @Get(':id/analytics/recent-triggers')
  async getRecentTriggers(
    @Request() req,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const project = await this.projectsService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== req.user.userId) {
      throw new ForbiddenException('Access denied');
    }

    const limitNum = limit ? parseInt(limit, 10) : 50;
    const triggers = await this.ruleAnalyticsService.getRecentTriggers(id, limitNum);

    return triggers;
  }

  private maskApiKey(project: any) {
    if (project.openaiApiKey) {
      const key = project.openaiApiKey;
      const masked = key.substring(0, 7) + '****' + key.slice(-4);
      return { ...project, openaiApiKey: masked };
    }
    return project;
  }
}

