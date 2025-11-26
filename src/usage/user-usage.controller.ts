import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsageService } from './usage.service';
import { ProjectsService } from '../projects/projects.service';

@Controller('projects/:projectId/usage')
@UseGuards(JwtAuthGuard)
export class UserUsageController {
  constructor(
    private readonly usageService: UsageService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get('summary')
  async getSummary(@Request() req, @Param('projectId') projectId: string) {
    // Verify ownership
    const project = await this.projectsService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== req.user.userId) {
      throw new ForbiddenException('Access denied');
    }

    const periodStart = this.getPeriodStart(project.limitPeriod || 'daily');
    const summary = await this.usageService.getSummaryForProject(
      projectId,
      periodStart,
    );

    return {
      requestsUsed: summary.totalRequests,
      tokensUsed: summary.totalTokens,
      dailyRequestLimit: project.dailyRequestLimit,
      dailyTokenLimit: project.dailyTokenLimit,
      limitPeriod: project.limitPeriod || 'daily',
      withinLimits:
        (!project.dailyRequestLimit ||
          summary.totalRequests < project.dailyRequestLimit) &&
        (!project.dailyTokenLimit ||
          summary.totalTokens < project.dailyTokenLimit),
    };
  }

  @Get('by-identity')
  async getByIdentity(
    @Request() req,
    @Param('projectId') projectId: string,
    @Query('date') date?: string,
  ) {
    // Verify ownership
    const project = await this.projectsService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== req.user.userId) {
      throw new ForbiddenException('Access denied');
    }

    const periodStart = date ? new Date(date) : this.getPeriodStart(project.limitPeriod || 'daily');
    const identities = await this.usageService.getByIdentity(
      projectId,
      periodStart,
    );

    return identities;
  }

  @Get('history')
  async getHistory(
    @Request() req,
    @Param('projectId') projectId: string,
    @Query('days') days?: string,
  ) {
    // Verify ownership
    const project = await this.projectsService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== req.user.userId) {
      throw new ForbiddenException('Access denied');
    }

    const numDays = days ? parseInt(days, 10) : 7;
    return this.usageService.getUsageHistory(projectId, Math.min(numDays, 30));
  }

  private getTodayUTC(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private getPeriodStart(limitPeriod: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const date = now.getUTCDate();
    const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

    switch (limitPeriod) {
      case 'daily':
        return new Date(Date.UTC(year, month, date));
      
      case 'weekly':
        // Start of week (Monday)
        const daysToMonday = (day + 6) % 7; // Calculate days back to Monday
        const weekStart = new Date(Date.UTC(year, month, date - daysToMonday));
        return weekStart;
      
      case 'monthly':
        // Start of month
        return new Date(Date.UTC(year, month, 1));
      
      default:
        return new Date(Date.UTC(year, month, date));
    }
  }
}

